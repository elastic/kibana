/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTreeView,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useRegisteredFeatures } from '../../hooks/use_registered_features';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';

interface CopyToModalProps {
  sourceFeatureName: string;
  currentFeatureId: string;
  taskType: string;
  onApply: (selectedFeatureIds: string[]) => void;
  onClose: () => void;
}

export const CopyToModal: React.FC<CopyToModalProps> = ({
  sourceFeatureName,
  currentFeatureId,
  taskType,
  onApply,
  onClose,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const { features: registeredFeatures } = useRegisteredFeatures();
  const [idToSelectedMap, setIdToSelectedMap] = useState<Record<string, boolean>>({});

  const handleToggle = useCallback((id: string) => {
    setIdToSelectedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const treeItems = useMemo(() => {
    const parentNameMap = new Map(
      registeredFeatures.filter((f) => !f.parentFeatureId).map((f) => [f.featureId, f.featureName])
    );

    const childrenByParent = registeredFeatures.reduce<Map<string, InferenceFeatureConfig[]>>(
      (acc, f) => {
        if (f.parentFeatureId === undefined) return acc;
        if (!acc.has(f.parentFeatureId)) acc.set(f.parentFeatureId, []);
        acc.get(f.parentFeatureId)!.push(f);
        return acc;
      },
      new Map()
    );

    return [...childrenByParent.entries()].flatMap(([parentId, children]) => {
      if (children.length === 0) return [];

      return [
        {
          id: `section-${parentId}`,
          label: parentNameMap.get(parentId) ?? parentId,
          children: children.map((f) => {
            const isDisabled =
              !f.taskType || f.taskType !== taskType || f.featureId === currentFeatureId;
            return {
              id: f.featureId,
              label: (
                <EuiCheckbox
                  id={`copy-target-${f.featureId}`}
                  label={f.featureName}
                  checked={idToSelectedMap[f.featureId] ?? false}
                  onChange={() => handleToggle(f.featureId)}
                  disabled={isDisabled}
                />
              ),
            };
          }),
        },
      ];
    });
  }, [registeredFeatures, currentFeatureId, taskType, idToSelectedMap, handleToggle]);

  const handleApply = useCallback(() => {
    const selected = Object.entries(idToSelectedMap)
      .filter(([, checked]) => checked)
      .map(([id]) => id);
    onApply(selected);
    onClose();
  }, [idToSelectedMap, onApply, onClose]);

  const hasSelection = Object.values(idToSelectedMap).some(Boolean);

  return (
    <EuiModal onClose={onClose} style={{ minWidth: 480 }} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.searchInferenceEndpoints.settings.copyTo.title', {
            defaultMessage: 'Copy to sub-features',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.searchInferenceEndpoints.settings.copyTo.description"
              defaultMessage="Copy the model list from {source} to the selected sub-features below. Only sub-features with matching task types can be selected."
              values={{ source: <strong>{sourceFeatureName}</strong> }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTreeView
          items={treeItems}
          expandByDefault
          showExpansionArrows
          aria-label={i18n.translate(
            'xpack.searchInferenceEndpoints.settings.copyTo.treeAriaLabel',
            { defaultMessage: 'Sub-features' }
          )}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="copy-to-modal-cancel">
          {i18n.translate('xpack.searchInferenceEndpoints.settings.copyTo.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={handleApply}
          isDisabled={!hasSelection}
          data-test-subj="copy-to-modal-apply"
        >
          {i18n.translate('xpack.searchInferenceEndpoints.settings.copyTo.apply', {
            defaultMessage: 'Apply',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
