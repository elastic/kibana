/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiSpacer,
  EuiButtonEmpty,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSelectable,
  EuiText,
  EuiLink,
  EuiBadge,
  EuiToken,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  prepareFieldsForEisUpdate,
  deNormalize,
  isElserOnMlNodeSemanticField,
} from '../../../../../components/mappings_editor/lib/utils';
import { useMappingsState } from '../../../../../components/mappings_editor/mappings_state_context';
import { documentationService } from '../../../../../services';
import { updateIndexMappings } from '../../../../../services/api';
import { notificationService } from '../../../../../services/notification';
import type { NormalizedFields } from '../../../../../components/mappings_editor/types';

export interface MappingsOptionData {
  name: string;
}

export interface UpdateElserMappingsModalProps {
  indexName: string;
  refetchMapping: () => void;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hasUpdatePrivileges: boolean | undefined;
  modalId: string;
}

export function UpdateElserMappingsModal({
  indexName,
  refetchMapping,
  setIsModalOpen,
  hasUpdatePrivileges,
  modalId,
}: UpdateElserMappingsModalProps) {
  const state = useMappingsState();
  const [options, setOptions] = useState<EuiSelectableOption<MappingsOptionData>[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const isApplyDisabled = options.every((o) => o.checked !== 'on') || hasUpdatePrivileges === false;

  const buildElserOptions = (
    mappings: NormalizedFields
  ): EuiSelectableOption<MappingsOptionData>[] => {
    const elserMappings = Object.values(mappings.byId).filter(isElserOnMlNodeSemanticField);

    return elserMappings.map((field) => ({
      label: field.path.join('.'),
      name: field.source.name,
      key: field.id,
      prepend: <EuiToken iconType="tokenSemanticText" />,
      append: <EuiBadge color="hollow">{field.source.inference_id as string}</EuiBadge>,
    }));
  };

  const renderMappingOption = useCallback((option: EuiSelectableOption<MappingsOptionData>) => {
    return (
      <>
        <EuiText size="s">{option.name}</EuiText>
        <EuiText size="xs" color="subdued" className="eui-displayBlock">
          <small>{option.label || ''}</small>
        </EuiText>
      </>
    );
  }, []);

  const handleError = (error: string | undefined) => {
    const errorToastTitle = i18n.translate(
      'xpack.idxMgmt.indexDetails.updateElserMappingsModal.error.title',
      {
        defaultMessage: 'Error updating mappings',
      }
    );

    const errorMessage = error
      ? i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.error.message', {
          defaultMessage: '{error}',
          values: { error },
        })
      : i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.error.defaultMessage', {
          defaultMessage: 'Mappings could not be updated. Please try again.',
        });

    notificationService.showDangerToast(errorToastTitle, errorMessage);
  };

  const handleApply = useCallback(async () => {
    setIsUpdating(true);
    const selectedOptions = options.filter((option) => option.checked === 'on');
    const selectedFields = prepareFieldsForEisUpdate(selectedOptions, state.mappingViewFields);
    const denormalizedFields = deNormalize(selectedFields);

    try {
      const { error } = await updateIndexMappings(indexName, denormalizedFields);

      if (!error) {
        notificationService.showSuccessToast(
          i18n.translate(
            'xpack.idxMgmt.indexDetails.updateElserMappingsModal.successfullyUpdatedIndexMappingsTitle',
            {
              defaultMessage: 'Mappings updated',
            }
          ),
          i18n.translate(
            'xpack.idxMgmt.indexDetails.updateElserMappingsModal.successfullyUpdatedIndexMappingsText',
            {
              defaultMessage: 'Your index mappings have been updated.',
            }
          )
        );
        refetchMapping();
      } else {
        handleError(error.message);
      }
    } catch (exception) {
      handleError(exception.message);
    } finally {
      setIsUpdating(false);
      setIsModalOpen(false);
    }
  }, [indexName, refetchMapping, options, setIsModalOpen, state.mappingViewFields]);

  useEffect(() => {
    const elserOptions = buildElserOptions(state.mappingViewFields);
    if (elserOptions) setOptions(elserOptions);
  }, [state]);

  return (
    <EuiModal
      style={{ width: 600 }}
      aria-labelledby={i18n.translate(
        'xpack.idxMgmt.indexDetails.updateElserMappingsModal.ariaLabelledBy',
        {
          defaultMessage: 'Update mappings to ELSER on EIS modal',
        }
      )}
      onClose={() => setIsModalOpen(false)}
      data-test-subj="updateElserMappingsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle size="s">
          {i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.title', {
            defaultMessage: 'Update mappings to ELSER on EIS',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          {i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.costsTransparency', {
            defaultMessage:
              'Performing inference and other ML tasks using the Elastic Inference Service (EIS) will incur token-based costs.',
          })}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiLink
          data-telemetry-id={`${modalId}-updateElserMappingsModal-learnMore-link`}
          href={documentationService.docLinks.enterpriseSearch.elasticInferenceServicePricing}
          target="_blank"
          external
        >
          {i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.learnMoreLink', {
            defaultMessage: 'Learn more',
          })}
        </EuiLink>
        <EuiSpacer size="l" />
        <EuiSelectable<MappingsOptionData>
          data-test-subj="updateElserMappingsSelect"
          aria-label={i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.select', {
            defaultMessage: 'Select ELSER mappings',
          })}
          options={options}
          listProps={{ bordered: true, isVirtualized: true, rowHeight: 50 }}
          onChange={(newOptions) => setOptions(newOptions)}
          renderOption={renderMappingOption}
        >
          {(list) => list}
        </EuiSelectable>
        <EuiSpacer size="l" />
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.updateConditions', {
            defaultMessage:
              'Only fields using .elser-2-elasticsearch can be updated to use .elser-2-elastic on the Elastic Inference Service.',
          })}
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
          <EuiButtonEmpty
            data-test-subj="UpdateElserMappingsModalCancelBtn"
            data-telemetry-id={`${modalId}-updateElserMappingsModal-cancel-btn`}
            onClick={() => setIsModalOpen(false)}
            aria-label={i18n.translate(
              'xpack.idxMgmt.indexDetails.updateElserMappingsModal.cancelButtonAriaLabel',
              {
                defaultMessage: 'Cancel and close modal',
              }
            )}
          >
            {i18n.translate(
              'xpack.idxMgmt.indexDetails.updateElserMappingsModal.cancelButtonLabel',
              {
                defaultMessage: 'Cancel',
              }
            )}
          </EuiButtonEmpty>
          <EuiButton
            fill
            onClick={handleApply}
            isLoading={isUpdating}
            data-test-subj="UpdateElserMappingsModalApplyBtn"
            data-telemetry-id={`${modalId}-updateElserMappingsModal-apply-btn`}
            isDisabled={isApplyDisabled}
          >
            {i18n.translate('xpack.idxMgmt.indexDetails.updateElserMappingsModal.applyButton', {
              defaultMessage: 'Apply',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
