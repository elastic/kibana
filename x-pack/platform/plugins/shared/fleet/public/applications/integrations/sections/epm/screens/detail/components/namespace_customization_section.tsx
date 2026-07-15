/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  isValidNamespace,
  isNamespaceAllowedByPrefixes,
} from '../../../../../../../../common/services';
import { useStartServices } from '../../../../../hooks';

interface Props {
  savedNamespaces: string[];
  allowedNamespacePrefixes: string[];
  namespaceCustomizationSettings?: { [namespace: string]: { ilm_policy?: string } };
  disabled?: boolean;
  isSubmitting?: boolean;
  onSave: (next: string[]) => void;
}

const setsEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((v) => setB.has(v));
};

export const NamespaceCustomizationSection: React.FC<Props> = ({
  savedNamespaces,
  allowedNamespacePrefixes,
  namespaceCustomizationSettings,
  disabled = false,
  isSubmitting = false,
  onSave,
}) => {
  const { docLinks } = useStartServices();
  const [draftNamespaces, setDraftNamespaces] = useState<string[]>(savedNamespaces);

  useEffect(() => {
    setDraftNamespaces(savedNamespaces);
  }, [savedNamespaces]);

  const prefixesForCheck = useMemo(
    () => (allowedNamespacePrefixes.length > 0 ? allowedNamespacePrefixes : null),
    [allowedNamespacePrefixes]
  );

  const isDirty = useMemo(
    () => !setsEqual(draftNamespaces, savedNamespaces),
    [draftNamespaces, savedNamespaces]
  );

  // Namespaces being removed that have an ILM policy — warn the user those policies will be cleared.
  const removedNamespacesWithIlm = useMemo(() => {
    if (!namespaceCustomizationSettings || !isDirty) return [];
    const draftSet = new Set(draftNamespaces);
    return savedNamespaces.filter(
      (ns) => !draftSet.has(ns) && !!namespaceCustomizationSettings[ns]?.ilm_policy
    );
  }, [draftNamespaces, savedNamespaces, namespaceCustomizationSettings, isDirty]);

  const selectedOptions = useMemo(
    () =>
      draftNamespaces.map((ns) => {
        const { valid } = isValidNamespace(ns);
        const isAllowed = isNamespaceAllowedByPrefixes(ns, prefixesForCheck);
        return {
          label: ns,
          value: ns,
          color: !valid || !isAllowed ? 'danger' : undefined,
        } as EuiComboBoxOptionOption<string>;
      }),
    [draftNamespaces, prefixesForCheck]
  );

  const validationErrors = useMemo(() => {
    const seen = new Set<string>();
    const errors: string[] = [];
    for (const ns of draftNamespaces) {
      const { valid, error } = isValidNamespace(ns);
      if (!valid && error) {
        if (!seen.has(error)) {
          seen.add(error);
          errors.push(error);
        }
      } else if (!isNamespaceAllowedByPrefixes(ns, prefixesForCheck)) {
        const prefixError = i18n.translate(
          'xpack.fleet.integrations.settings.namespaceCustomization.notAllowedPrefixError',
          {
            defaultMessage:
              'Namespace must start with one of the allowed prefixes for this space: {prefixes}',
            values: { prefixes: allowedNamespacePrefixes.join(', ') },
          }
        );
        if (!seen.has(prefixError)) {
          seen.add(prefixError);
          errors.push(prefixError);
        }
      }
    }
    return errors;
  }, [draftNamespaces, prefixesForCheck, allowedNamespacePrefixes]);

  const hasValidationError = validationErrors.length > 0;

  const handleCreate = useCallback((rawInput: string) => {
    const newNamespace = rawInput.trim();
    if (!newNamespace) return;
    setDraftNamespaces((prev) => [...prev, newNamespace]);
  }, []);

  const handleChange = useCallback((next: Array<EuiComboBoxOptionOption<string>>) => {
    setDraftNamespaces(next.map((option) => option.value ?? option.label));
  }, []);

  const handleSave = useCallback(() => {
    onSave(draftNamespaces);
  }, [draftNamespaces, onSave]);

  const handleDiscard = useCallback(() => {
    setDraftNamespaces(savedNamespaces);
  }, [savedNamespaces]);

  return (
    <>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.fleet.integrations.settings.namespaceCustomization.title"
            defaultMessage="Namespace index templates"
          />
        </h4>
      </EuiTitle>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.integrations.settings.namespaceCustomization.description"
          defaultMessage="Select which namespaces use dedicated index templates for this integration. This enables independent settings and mappings per namespace. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <EuiLink href={docLinks.links.fleet.datastreams} external={true} target="_blank">
                <FormattedMessage
                  id="xpack.fleet.integrations.settings.namespaceCustomization.learnMoreLink"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow
        isInvalid={hasValidationError}
        error={validationErrors}
        label={i18n.translate('xpack.fleet.integrations.settings.namespaceCustomization.label', {
          defaultMessage: 'Namespaces with dedicated index templates',
        })}
        helpText={
          allowedNamespacePrefixes.length > 0 && (
            <FormattedMessage
              id="xpack.fleet.integrations.settings.namespaceCustomization.helpTextWithPrefixes"
              defaultMessage="Only namespaces starting with the allowed prefixes for this space can be added: {prefixes}."
              values={{ prefixes: allowedNamespacePrefixes.join(', ') }}
            />
          )
        }
      >
        <EuiComboBox<string>
          data-test-subj="epmSettings.namespaceCustomizationInput"
          noSuggestions
          isDisabled={disabled || isSubmitting}
          isInvalid={hasValidationError}
          placeholder={i18n.translate(
            'xpack.fleet.integrations.settings.namespaceCustomization.placeholder',
            { defaultMessage: 'Add a namespace' }
          )}
          selectedOptions={selectedOptions}
          onCreateOption={handleCreate}
          onChange={handleChange}
        />
      </EuiFormRow>
      {removedNamespacesWithIlm.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            size="s"
            iconType="warning"
            color="warning"
            title={i18n.translate(
              'xpack.fleet.integrations.settings.namespaceCustomization.ilmWillBeRemovedTitle',
              { defaultMessage: 'ILM policy will be removed' }
            )}
          >
            <FormattedMessage
              id="xpack.fleet.integrations.settings.namespaceCustomization.ilmWillBeRemovedBody"
              defaultMessage="Removing {namespaces} will also clear the ILM policy assigned to {count, plural, one {that namespace} other {those namespaces}}."
              values={{
                namespaces: <strong>{removedNamespacesWithIlm.join(', ')}</strong>,
                count: removedNamespacesWithIlm.length,
              }}
            />
          </EuiCallOut>
        </>
      )}

      {(isDirty || isSubmitting) && (
        <>
          <EuiSpacer size="s" />
          {isSubmitting ? (
            <EuiText
              size="xs"
              color="subdued"
              data-test-subj="epmSettings.namespaceCustomizationApplying"
            >
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <FormattedMessage
                    id="xpack.fleet.integrations.settings.namespaceCustomization.applying"
                    defaultMessage="Applying changes to namespace index templates…"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiText>
          ) : (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  fill
                  disabled={hasValidationError || disabled}
                  onClick={handleSave}
                  data-test-subj="epmSettings.namespaceCustomizationSave"
                >
                  <FormattedMessage
                    id="xpack.fleet.integrations.settings.namespaceCustomization.saveButton"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  onClick={handleDiscard}
                  data-test-subj="epmSettings.namespaceCustomizationDiscard"
                >
                  <FormattedMessage
                    id="xpack.fleet.integrations.settings.namespaceCustomization.discardButton"
                    defaultMessage="Discard changes"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </>
      )}
    </>
  );
};
