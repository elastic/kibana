/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, lazy, Suspense, useEffect } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  useEuiTheme,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InferenceCostsTransparencyTour } from '@kbn/search-api-panels';

import { useCompatibleInferenceEndpoints } from '../../../../../../hooks/use_compatible_inference_endpoints';
import { getFieldConfig } from '../../../lib';
import { useAppContext } from '../../../../../app_context';
import { useLoadInferenceEndpoints } from '../../../../../services/api';
import { documentationService, UseField } from '../../../shared_imports';

const InferenceFlyoutWrapper = lazy(() => import('@kbn/inference-endpoint-ui-common'));
export interface SelectInferenceIdProps {
  'data-test-subj'?: string;
}

type SelectInferenceIdContentProps = SelectInferenceIdProps & {
  setValue: (value: string) => void;
  value: string;
};

interface EndpointOptionData {
  description: string;
}

export const SelectInferenceId: React.FC<SelectInferenceIdProps> = ({
  'data-test-subj': dataTestSubj,
}: SelectInferenceIdProps) => {
  const config = getFieldConfig('inference_id');
  return (
    <UseField path="inference_id" fieldConfig={config}>
      {(field) => {
        return (
          <SelectInferenceIdContent
            data-test-subj={dataTestSubj}
            value={field.value as string}
            setValue={field.setValue}
          />
        );
      }}
    </UseField>
  );
};

const SelectInferenceIdContent: React.FC<SelectInferenceIdContentProps> = ({
  'data-test-subj': dataTestSubj,
  setValue,
  value,
}) => {
  const {
    core: { application, http },
    config: { enforceAdaptiveAllocations },
    services: {
      notificationService: { toasts },
    },
    docLinks,
    plugins: { cloud, share },
  } = useAppContext();
  const {
    isLoading: endpointsLoading,
    data: endpoints,
    resendRequest,
  } = useLoadInferenceEndpoints();
  const { euiTheme } = useEuiTheme();
  const { compatibleEndpoints, isLoading: isCompatibleEndpointsLoading } =
    useCompatibleInferenceEndpoints(endpoints, endpointsLoading);
  const [isSelectInferenceIdOpen, setIsSelectInferenceIdOpen] = useState(false);
  const [isInferenceFlyoutVisible, setIsInferenceFlyoutVisible] = useState<boolean>(false);
  const [isInferencePopoverVisible, setIsInferencePopoverVisible] = useState<boolean>(false);

  const config = getFieldConfig('inference_id');
  const inferenceEndpointsPageLink = share?.url.locators
    .get('SEARCH_INFERENCE_ENDPOINTS')
    ?.useUrl({});

  const onFlyoutClose = useCallback(() => {
    setIsInferenceFlyoutVisible(false);
  }, []);

  const closePopover = useCallback(() => {
    setIsInferencePopoverVisible(false);
  }, []);

  const onSubmitSuccess = useCallback(
    (newEndpointId: string) => {
      resendRequest();
      setValue(newEndpointId);
    },
    [resendRequest, setValue]
  );

  /**
   * Computes the selectable options for the inference endpoint dropdown.
   * Only includes endpoints compatible with semantic_text (text_embedding and sparse_embedding).
   * Includes optimistic updates for newly created endpoints that may not be in the list yet.
   */
  const options: EuiSelectableOption<EndpointOptionData>[] = useMemo(() => {
    const selectableOptions: EuiSelectableOption<EndpointOptionData>[] =
      compatibleEndpoints?.endpointDefinitions?.map((endpoint) => {
        return {
          key: endpoint.inference_id,
          label: endpoint.inference_id,
          'data-test-subj': `custom-inference_${endpoint.inference_id}`,
          checked: value === endpoint.inference_id ? 'on' : undefined,
          description: endpoint.description,
          disabled: !endpoint.accessible,
          append: !endpoint.accessible && endpoint.requiredLicense && (
            <EuiBadge color="hollow" iconType="lock">
              {endpoint.requiredLicense[0].toUpperCase() + endpoint.requiredLicense.slice(1)}
            </EuiBadge>
          ),
          'aria-label':
            !endpoint.accessible && endpoint.requiredLicense
              ? i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.selectable.disabledOption.ariaLabel',
                  {
                    defaultMessage: '{inferenceId} endpoint disabled - {license} license required',
                    values: {
                      inferenceId: endpoint.inference_id,
                      license: endpoint.requiredLicense,
                    },
                  }
                )
              : undefined,
        };
      }) || [];

    // Optimistic update: if a value is set but not in the list, add it
    // (handles race condition where backend hasn't updated yet after creating a new endpoint)
    const isValueInOptions = selectableOptions.some((option) => option.label === value);
    if (value && !isValueInOptions) {
      selectableOptions.push({
        key: value,
        label: value,
        checked: 'on',
        'data-test-subj': `custom-inference_${value}`,
        description: '',
      });
    }
    return selectableOptions;
  }, [compatibleEndpoints, value]);

  const selectedOptionLabel = options.find((option) => option.checked)?.label;

  const renderEndpointOption = useCallback((option: EuiSelectableOption<EndpointOptionData>) => {
    return (
      <>
        <EuiText size="s">{option.label}</EuiText>
        <EuiText size="xs" color="subdued" className="eui-displayBlock">
          <small>{option.description}</small>
        </EuiText>
      </>
    );
  }, []);

  /**
   * Auto-select default inference endpoint when:
   * - No endpoint is currently selected (!value)
   * - Endpoints have been loaded (endpoints?.length)
   * This ensures a good default UX without requiring manual selection.
   */
  useEffect(() => {
    if (!value && compatibleEndpoints?.defaultInferenceId) {
      setValue(compatibleEndpoints?.defaultInferenceId);
    }
  }, [value, setValue, compatibleEndpoints]);

  /**
   * Sets state to indicate the dropdown select is open after a delay to match animation timing.
   * This ensures the InferenceCostsTransparencyTour component displays in the right place after the initial
   * animation completes.
   */
  useEffect(() => {
    const delay = parseInt(euiTheme.animation.normal ?? '0', 10);

    const timeout = window.setTimeout(() => {
      setIsSelectInferenceIdOpen(true);
    }, delay);

    return () => clearTimeout(timeout);
  }, [euiTheme.animation.normal]);

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup data-test-subj="selectInferenceId" alignItems="flexEnd">
        <EuiFlexItem grow={false} css={{ minWidth: euiTheme.base * 19 }}>
          <EuiPopover
            button={
              <>
                <EuiText size="xs">
                  <p>
                    <strong>{config.label}</strong>
                  </p>
                </EuiText>
                <EuiSpacer size="xs" />
                <InferenceCostsTransparencyTour
                  promoId="selectInferenceId"
                  ctaLink={documentationService.getCloudPricing()}
                  isCloudEnabled={cloud?.isCloudEnabled ?? false}
                  isReady={isSelectInferenceIdOpen}
                >
                  <EuiButton
                    iconType="arrowDown"
                    iconSide="right"
                    color="text"
                    fullWidth
                    contentProps={{ style: { justifyContent: 'space-between' } }}
                    data-test-subj="inferenceIdButton"
                    onClick={() => {
                      setIsInferencePopoverVisible((prev) => !prev);
                    }}
                  >
                    {selectedOptionLabel ||
                      i18n.translate(
                        'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.alreadyExistsLabel',
                        { defaultMessage: 'No inference endpoint selected' }
                      )}
                  </EuiButton>
                </InferenceCostsTransparencyTour>
              </>
            }
            isOpen={isInferencePopoverVisible}
            panelPaddingSize="none"
            closePopover={closePopover}
          >
            <EuiContextMenuPanel>
              <EuiContextMenuItem
                key="createInferenceEndpointButton"
                icon="plusInCircle"
                size="s"
                data-test-subj="createInferenceEndpointButton"
                onClick={(e) => {
                  e.preventDefault();
                  setIsInferenceFlyoutVisible(true);
                  setIsInferencePopoverVisible(false);
                }}
              >
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.createInferenceEndpointButton',
                  {
                    defaultMessage: 'Add inference endpoint',
                  }
                )}
              </EuiContextMenuItem>
              {inferenceEndpointsPageLink && (
                <EuiContextMenuItem
                  key="manageInferenceEndpointButton"
                  icon="gear"
                  size="s"
                  data-test-subj="manageInferenceEndpointButton"
                  href={inferenceEndpointsPageLink}
                  onClick={(e) => {
                    e.preventDefault();
                    application.navigateToUrl(inferenceEndpointsPageLink);
                  }}
                >
                  {i18n.translate(
                    'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.manageInferenceEndpointButton',
                    {
                      defaultMessage: 'Manage Inference Endpoints',
                    }
                  )}
                </EuiContextMenuItem>
              )}
            </EuiContextMenuPanel>
            <EuiHorizontalRule margin="none" />
            <EuiContextMenuPanel>
              <EuiPanel color="transparent" paddingSize="s">
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.selectable.Label',
                    {
                      defaultMessage: 'Existing endpoints',
                    }
                  )}
                >
                  <EuiSelectable<EndpointOptionData>
                    id="inferenceEndpointsSelectable"
                    aria-label={i18n.translate(
                      'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.selectable.ariaLabel',
                      {
                        defaultMessage: 'Existing endpoints',
                      }
                    )}
                    data-test-subj={dataTestSubj}
                    searchable
                    isLoading={isCompatibleEndpointsLoading}
                    singleSelection="always"
                    defaultChecked
                    searchProps={{
                      compressed: true,
                      placeholder: i18n.translate(
                        'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.selectable.placeholder',
                        {
                          defaultMessage: 'Search',
                        }
                      ),
                    }}
                    options={options}
                    onChange={(newOptions) => {
                      setValue(newOptions.find((option) => option.checked)?.label || '');
                    }}
                    renderOption={renderEndpointOption}
                    listProps={{
                      isVirtualized: false,
                    }}
                    height={euiTheme.base * 15}
                  >
                    {(list, search) => (
                      <>
                        {search}
                        <EuiHorizontalRule margin="xs" />
                        {list}
                      </>
                    )}
                  </EuiSelectable>
                </EuiFormRow>
              </EuiPanel>
            </EuiContextMenuPanel>
            <EuiHorizontalRule margin="none" />
            <EuiContextMenuItem icon={<EuiIcon type="question" color="primary" />} size="m">
              <EuiLink
                href={docLinks.links.inferenceManagement.inferenceAPIDocumentation}
                target="_blank"
                data-test-subj="learn-how-to-create-inference-endpoints"
              >
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.learnHowToCreateInferenceEndpoints',
                  {
                    defaultMessage: 'Learn how to create inference endpoints',
                  }
                )}
              </EuiLink>
            </EuiContextMenuItem>
          </EuiPopover>

          {isInferenceFlyoutVisible && (
            <Suspense fallback={<EuiLoadingSpinner size="l" />}>
              <InferenceFlyoutWrapper
                onFlyoutClose={onFlyoutClose}
                http={http}
                toasts={toasts}
                isEdit={false}
                onSubmitSuccess={onSubmitSuccess}
                enforceAdaptiveAllocations={enforceAdaptiveAllocations}
              />
            </Suspense>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPanel color="transparent" paddingSize="s">
            <EuiText color="subdued" size="s">
              <p>
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.parameters.noReferenceModelStartWarningMessage',
                  {
                    defaultMessage:
                      'For models that use ML nodes, the referenced model will be started when adding this field.',
                  }
                )}
              </p>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
