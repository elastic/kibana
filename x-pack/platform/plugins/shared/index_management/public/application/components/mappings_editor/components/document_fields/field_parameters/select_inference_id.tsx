/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  EuiSelectableOption,
  EuiSpacer,
  EuiText,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';

import { getFieldConfig } from '../../../lib';
import { useAppContext } from '../../../../../app_context';
import { useLoadInferenceEndpoints } from '../../../../../services/api';
import { UseField } from '../../../shared_imports';

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
    services: {
      notificationService: { toasts },
    },
    docLinks,
    plugins: { share },
  } = useAppContext();
  const config = getFieldConfig('inference_id');

  const inferenceEndpointsPageLink = share?.url.locators
    .get('SEARCH_INFERENCE_ENDPOINTS')
    ?.useUrl({});

  const [isInferenceFlyoutVisible, setIsInferenceFlyoutVisible] = useState<boolean>(false);
  const onFlyoutClose = useCallback(() => {
    setIsInferenceFlyoutVisible(!isInferenceFlyoutVisible);
  }, [isInferenceFlyoutVisible]);

  const { isLoading, data: endpoints, resendRequest } = useLoadInferenceEndpoints();

  const onSubmitSuccess = useCallback(
    (newEndpointId: string) => {
      resendRequest();
      setValue(newEndpointId);
    },
    [resendRequest, setValue]
  );

  const options: EuiSelectableOption[] = useMemo(() => {
    const filteredEndpoints = endpoints?.filter(
      (endpoint) =>
        endpoint.task_type === 'text_embedding' || endpoint.task_type === 'sparse_embedding'
    );

    const newOptions: EuiSelectableOption[] = [...(filteredEndpoints || [])].map((endpoint) => ({
      label: endpoint.inference_id,
      'data-test-subj': `custom-inference_${endpoint.inference_id}`,
      checked: value === endpoint.inference_id ? 'on' : undefined,
    }));
    /**
     * Adding this check to ensure we have the preconfigured elser endpoint selected by default.
     */
    const hasInferenceSelected = newOptions.some((option) => option.checked === 'on');
    if (!hasInferenceSelected && newOptions.length > 0) {
      newOptions[0].checked = 'on';
    }

    if (value && !newOptions.find((option) => option.label === value)) {
      // Sometimes we create a new endpoint but the backend is slow in updating so we need to optimistically update
      const newOption: EuiSelectableOption = {
        label: value,
        checked: 'on',
        'data-test-subj': `custom-inference_${value}`,
      };
      return [...newOptions, newOption];
    }
    return newOptions;
  }, [endpoints, value]);

  const [isInferencePopoverVisible, setIsInferencePopoverVisible] = useState<boolean>(false);

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
              setIsInferencePopoverVisible(!isInferencePopoverVisible);
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
      closePopover={() => setIsInferencePopoverVisible(!isInferencePopoverVisible)}
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
            setIsInferencePopoverVisible(!isInferencePopoverVisible);
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
      <EuiContextMenuItem icon={<EuiIcon type="help" color="primary" />} size="m">
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
  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup data-test-subj="selectInferenceId" alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          {inferencePopover()}
          {isInferenceFlyoutVisible ? (
            <Suspense fallback={<EuiLoadingSpinner size="l" />}>
              <InferenceFlyoutWrapper
                onFlyoutClose={onFlyoutClose}
                http={http}
                toasts={toasts}
                isEdit={false}
                onSubmitSuccess={onSubmitSuccess}
              />
            </Suspense>
          ) : null}
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
