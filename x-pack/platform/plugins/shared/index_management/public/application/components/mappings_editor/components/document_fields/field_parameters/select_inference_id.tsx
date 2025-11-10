/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import React, { useState, useCallback, useMemo, lazy, Suspense, useEffect } from 'react';

import { getFieldConfig } from '../../../lib';
import { useAppContext } from '../../../../../app_context';
import { useLoadInferenceEndpoints } from '../../../../../services/api';
import { UseField } from '../../../shared_imports';
import { MlVcuUsageCostTour } from './ml_vcu_usage_cost_tour';
const InferenceFlyoutWrapper = lazy(() => import('@kbn/inference-endpoint-ui-common'));
export interface SelectInferenceIdProps {
  'data-test-subj'?: string;
}

type SelectInferenceIdContentProps = SelectInferenceIdProps & {
  setValue: (value: string) => void;
  value: string;
};

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
  const { isLoading, data: endpoints, resendRequest } = useLoadInferenceEndpoints();
  const [isInferenceFlyoutVisible, setIsInferenceFlyoutVisible] = useState<boolean>(false);
  const [isInferencePopoverVisible, setIsInferencePopoverVisible] = useState<boolean>(false);

  const config = getFieldConfig('inference_id');
  const inferenceEndpointsPageLink = share?.url.locators
    .get('SEARCH_INFERENCE_ENDPOINTS')
    ?.useUrl({});

  const onFlyoutClose = useCallback(() => {
    setIsInferenceFlyoutVisible((prev) => !prev);
  }, []);

  const onSubmitSuccess = useCallback(
    (newEndpointId: string) => {
      resendRequest();
      setValue(newEndpointId);
    },
    [resendRequest, setValue]
  );

  // Get the ID of the default inference endpoint (.elser-2-elastic), and if that's not an option
  // then return the ID of the first endpoint in the list
  const getDefaultInferenceId = useCallback((endpointsList: typeof endpoints) => {
    const elserInEis = endpointsList?.find(
      (e) => e.inference_id === defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID
    );
    return elserInEis?.inference_id || endpointsList?.[0]?.inference_id;
  }, []);

  // Compute selectable options from endpoints and current value
  const options: EuiSelectableOption[] = useMemo(() => {
    const filteredEndpoints =
      endpoints?.filter(
        (endpoint) =>
          endpoint.task_type === 'text_embedding' || endpoint.task_type === 'sparse_embedding'
      ) || [];

    const baseOptions: EuiSelectableOption[] = filteredEndpoints.map((endpoint) => ({
      label: endpoint.inference_id,
      'data-test-subj': `custom-inference_${endpoint.inference_id}`,
      checked: value === endpoint.inference_id ? 'on' : undefined,
    }));

    // Sometimes we create a new endpoint but the backend is slow in updating so we need to optimistically update
    if (value && !baseOptions.find((o) => o.label === value)) {
      baseOptions.push({
        label: value,
        checked: 'on',
        'data-test-subj': `custom-inference_${value}`,
      });
    }

    return baseOptions;
  }, [endpoints, value]);

  const selectedOptionLabel = options.find((option) => option.checked)?.label;

  const inferencePopover = () => (
    <EuiPopover
      button={
        <>
          <EuiText size="xs">
            <p>
              <strong>{config.label}</strong>
            </p>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiButton
            iconType="arrowDown"
            iconSide="right"
            color="text"
            data-test-subj="inferenceIdButton"
            onClick={() => {
              setIsInferencePopoverVisible((prev) => !prev);
            }}
          >
            {selectedOptionLabel ||
              i18n.translate(
                'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.alreadyExistsLabel',
                {
                  defaultMessage: 'No inference endpoint selected',
                }
              )}
          </EuiButton>
        </>
      }
      isOpen={isInferencePopoverVisible}
      panelPaddingSize="none"
      closePopover={() => setIsInferencePopoverVisible((prev) => !prev)}
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
            setIsInferencePopoverVisible((prev) => !prev);
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
            <EuiSelectable
              aria-label={i18n.translate(
                'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.selectable.ariaLabel',
                {
                  defaultMessage: 'Existing endpoints',
                }
              )}
              data-test-subj={dataTestSubj}
              searchable
              isLoading={isLoading}
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
  );

  // When no inference endpoint is selected, automatically set it to the default endpoint
  useEffect(() => {
    if (!value && endpoints?.length) {
      const defaultId = getDefaultInferenceId(endpoints);
      if (defaultId) {
        setValue(defaultId);
      }
    }
  }, [endpoints, value, setValue, getDefaultInferenceId]);

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup data-test-subj="selectInferenceId" alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          {cloud?.isServerlessEnabled ? (
            <MlVcuUsageCostTour children={inferencePopover()} />
          ) : (
            inferencePopover()
          )}

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
                      'The referenced model for this inference endpoint will be started when adding this field.',
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
