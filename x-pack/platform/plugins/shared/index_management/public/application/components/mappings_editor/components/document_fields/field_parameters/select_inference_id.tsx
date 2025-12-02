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

// Task types that are compatible with semantic_text field type
const COMPATIBLE_TASK_TYPES = ['text_embedding', 'sparse_embedding'] as const;
type CompatibleTaskType = (typeof COMPATIBLE_TASK_TYPES)[number];

/**
 * Type guard to check if a task type is compatible with semantic_text fields
 */
const isCompatibleTaskType = (taskType: string): taskType is CompatibleTaskType => {
  return COMPATIBLE_TASK_TYPES.includes(taskType as CompatibleTaskType);
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
   * Determines the default inference endpoint ID to select.
   * Prioritizes .elser-2-elastic (ELSER in EIS), falls back to the first available compatible endpoint.
   * Only considers endpoints compatible with semantic_text field type.
   */
  const getDefaultInferenceId = useCallback((endpointsList: typeof endpoints) => {
    if (!endpointsList?.length) {
      return undefined;
    }

    // Filter to only compatible endpoints first
    const compatibleEndpoints = endpointsList.filter((endpoint) =>
      isCompatibleTaskType(endpoint.task_type)
    );

    if (!compatibleEndpoints.length) {
      return undefined;
    }

    const elserInEis = compatibleEndpoints.find(
      (endpoint) => endpoint.inference_id === defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID
    );

    return elserInEis?.inference_id ?? compatibleEndpoints[0].inference_id;
  }, []);

  /**
   * Computes the selectable options for the inference endpoint dropdown.
   * Only includes endpoints compatible with semantic_text (text_embedding and sparse_embedding).
   * Includes optimistic updates for newly created endpoints that may not be in the list yet.
   */
  const options: EuiSelectableOption[] = useMemo(() => {
    // Filter to only text and sparse embedding endpoints (compatible with semantic_text)
    const compatibleEndpoints =
      endpoints?.filter((endpoint) => isCompatibleTaskType(endpoint.task_type)) ?? [];

    const selectableOptions: EuiSelectableOption[] = compatibleEndpoints.map((endpoint) => ({
      label: endpoint.inference_id,
      'data-test-subj': `custom-inference_${endpoint.inference_id}`,
      checked: value === endpoint.inference_id ? 'on' : undefined,
    }));

    // Optimistic update: if a value is set but not in the list, add it
    // (handles race condition where backend hasn't updated yet after creating a new endpoint)
    const isValueInOptions = selectableOptions.some((option) => option.label === value);
    if (value && !isValueInOptions) {
      selectableOptions.push({
        label: value,
        checked: 'on',
        'data-test-subj': `custom-inference_${value}`,
      });
    }

    return selectableOptions;
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

  /**
   * Auto-select default inference endpoint when:
   * - No endpoint is currently selected (!value)
   * - Endpoints have been loaded (endpoints?.length)
   * This ensures a good default UX without requiring manual selection.
   */
  useEffect(() => {
    const shouldSetDefault = !value && endpoints?.length;
    if (!shouldSetDefault) {
      return;
    }

    const defaultId = getDefaultInferenceId(endpoints);
    if (defaultId) {
      setValue(defaultId);
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
