/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

/**
 * Prototype stub policies for the bulk “Link to Action policy” flow.
 * Not wired to the action-policies API yet.
 */
export interface BulkLinkableActionPolicy {
  id: string;
  name: string;
  tags: string[];
}

export interface BulkLinkRuleRow {
  id: string;
  name: string;
  tags: string[];
}

export const BULK_LINK_ACTION_POLICIES: BulkLinkableActionPolicy[] = [
  {
    id: 'security-escalation',
    name: 'Security escalation policy',
    tags: ['security', 'escalation'],
  },
  {
    id: 'platform-paging',
    name: 'Platform paging (PagerDuty)',
    tags: ['platform', 'paging'],
  },
  {
    id: 'cs-digest',
    name: 'Customer success digest',
    tags: ['customer-success'],
  },
  {
    id: 'nightly-silence',
    name: 'Nightly silence window',
    tags: ['silence', 'maintenance'],
  },
];

type LinkStrategy = 'use_policy_tags' | 'add_new_tag';

export interface BulkLinkActionPolicyResult {
  policy: BulkLinkableActionPolicy;
  strategy: LinkStrategy;
  /** Tags that will be added to every selected rule. */
  tagsToAdd: string[];
  ruleIds: string[];
}

interface Props {
  rules: BulkLinkRuleRow[];
  /** Total selected count (may exceed `rules.length` when select-all spans pages). */
  ruleCount: number;
  onCancel: () => void;
  onConfirm: (result: BulkLinkActionPolicyResult) => void;
}

export const BulkLinkActionPolicyModal: React.FC<Props> = ({
  rules,
  ruleCount,
  onCancel,
  onConfirm,
}) => {
  const titleId = useGeneratedHtmlId();
  const [selectedPolicyOption, setSelectedPolicyOption] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const [linkStrategy, setLinkStrategy] = useState<LinkStrategy>('use_policy_tags');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newSharedTag, setNewSharedTag] = useState('');

  const policyOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => BULK_LINK_ACTION_POLICIES.map((policy) => ({ label: policy.name, value: policy.id })),
    []
  );

  const selectedPolicy = useMemo(() => {
    const id = selectedPolicyOption[0]?.value;
    return BULK_LINK_ACTION_POLICIES.find((policy) => policy.id === id) ?? null;
  }, [selectedPolicyOption]);

  const onPolicyChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    const next = selected.slice(0, 1);
    setSelectedPolicyOption(next);
    const policy = BULK_LINK_ACTION_POLICIES.find((item) => item.id === next[0]?.value);
    setSelectedTags(policy ? [...policy.tags] : []);
    setLinkStrategy('use_policy_tags');
    setNewSharedTag('');
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== tag);
      }
      return [...current, tag];
    });
  };

  const canConfirm =
    Boolean(selectedPolicy) &&
    (linkStrategy === 'use_policy_tags'
      ? selectedTags.length > 0
      : Boolean(newSharedTag.trim()));

  const handleConfirm = () => {
    if (!selectedPolicy || !canConfirm) {
      return;
    }
    onConfirm({
      policy: selectedPolicy,
      strategy: linkStrategy,
      tagsToAdd:
        linkStrategy === 'use_policy_tags' ? selectedTags : [newSharedTag.trim()],
      ruleIds: rules.map((rule) => rule.id),
    });
  };

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby={titleId}
      style={{ width: 720 }}
      data-test-subj="bulkLinkActionPolicyModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.alertingV2.bulkLinkActionPolicyModal.title', {
            defaultMessage:
              'Link {count, plural, one {# rule} other {# rules}} to an action policy',
            values: { count: ruleCount },
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.alertingV2.bulkLinkActionPolicyModal.intro"
              defaultMessage="Action policies link through tags. Choose a policy and how tags should be updated on the selected rules."
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.alertingV2.bulkLinkActionPolicyModal.policyLabel', {
            defaultMessage: 'Action policy',
          })}
        >
          <EuiComboBox
            fullWidth
            singleSelection={{ asPlainText: true }}
            options={policyOptions}
            selectedOptions={selectedPolicyOption}
            onChange={onPolicyChange}
            placeholder={i18n.translate(
              'xpack.alertingV2.bulkLinkActionPolicyModal.policyPlaceholder',
              { defaultMessage: 'Select an action policy' }
            )}
            data-test-subj="bulkLinkActionPolicySelect"
          />
        </EuiFormRow>

        {selectedPolicy && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiCheckableCard
                  id="bulkLinkStrategy-use_policy_tags"
                  data-test-subj="bulkLinkStrategy-use_policy_tags"
                  checkableType="radio"
                  name="bulkLinkStrategy"
                  checked={linkStrategy === 'use_policy_tags'}
                  onChange={() => setLinkStrategy('use_policy_tags')}
                  label={i18n.translate(
                    'xpack.alertingV2.bulkLinkActionPolicyModal.usePolicyTags',
                    {
                      defaultMessage:
                        'Add one or more tags from this policy’s scope to the selected rules',
                    }
                  )}
                >
                  <EuiFlexGroup gutterSize="s" wrap responsive={false}>
                    {selectedPolicy.tags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      const isDisabled = linkStrategy !== 'use_policy_tags';
                      return (
                        <EuiFlexItem grow={false} key={tag}>
                          <EuiBadge
                            color={isSelected ? 'primary' : 'hollow'}
                            onClick={isDisabled ? undefined : () => toggleTag(tag)}
                            onClickAriaLabel={
                              isSelected
                                ? i18n.translate(
                                    'xpack.alertingV2.bulkLinkActionPolicyModal.deselectTag',
                                    {
                                      defaultMessage: 'Deselect tag {tag}',
                                      values: { tag },
                                    }
                                  )
                                : i18n.translate(
                                    'xpack.alertingV2.bulkLinkActionPolicyModal.selectTag',
                                    {
                                      defaultMessage: 'Select tag {tag}',
                                      values: { tag },
                                    }
                                  )
                            }
                          >
                            {tag}
                          </EuiBadge>
                        </EuiFlexItem>
                      );
                    })}
                  </EuiFlexGroup>
                </EuiCheckableCard>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCheckableCard
                  id="bulkLinkStrategy-add_new_tag"
                  data-test-subj="bulkLinkStrategy-add_new_tag"
                  checkableType="radio"
                  name="bulkLinkStrategy"
                  checked={linkStrategy === 'add_new_tag'}
                  onChange={() => setLinkStrategy('add_new_tag')}
                  label={i18n.translate('xpack.alertingV2.bulkLinkActionPolicyModal.addNewTag', {
                    defaultMessage:
                      'Create a new shared tag for these rules and the action policy',
                  })}
                >
                  <div style={{ maxWidth: 280 }}>
                    <EuiFieldText
                      compressed
                      fullWidth
                      disabled={linkStrategy !== 'add_new_tag'}
                      prepend={i18n.translate(
                        'xpack.alertingV2.bulkLinkActionPolicyModal.newTagPrepend',
                        { defaultMessage: 'New tag' }
                      )}
                      value={newSharedTag}
                      onChange={(event) => setNewSharedTag(event.target.value)}
                      placeholder="e.g. shared-routing"
                      data-test-subj="bulkLinkActionPolicyNewTagInput"
                      aria-label={i18n.translate(
                        'xpack.alertingV2.bulkLinkActionPolicyModal.newTagAriaLabel',
                        { defaultMessage: 'New tag' }
                      )}
                    />
                  </div>
                </EuiCheckableCard>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="bulkLinkActionPolicyCancel">
          {i18n.translate('xpack.alertingV2.bulkLinkActionPolicyModal.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={handleConfirm}
          isDisabled={!canConfirm}
          data-test-subj="bulkLinkActionPolicyConfirm"
        >
          {i18n.translate('xpack.alertingV2.bulkLinkActionPolicyModal.confirm', {
            defaultMessage: 'Link rules',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
