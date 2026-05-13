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
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
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

interface Props {
  savedNamespaces: string[];
  allowedNamespacePrefixes: string[];
  disabled?: boolean;
  isSubmitting?: boolean;
  onSave: (next: string[]) => void;
}

const toOptions = (values: string[]): Array<EuiComboBoxOptionOption<string>> =>
  values.map((v) => ({ label: v, value: v }));

const setsEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((v) => setB.has(v));
};

export const NamespaceCustomizationSection: React.FC<Props> = ({
  savedNamespaces,
  allowedNamespacePrefixes,
  disabled = false,
  isSubmitting = false,
  onSave,
}) => {
  const [draftNamespaces, setDraftNamespaces] = useState<string[]>(savedNamespaces);
  const [validationError, setValidationError] = useState<string | undefined>(undefined);

  // Reset draft and clear error after a successful save (savedNamespaces prop changes).
  useEffect(() => {
    setDraftNamespaces(savedNamespaces);
    setValidationError(undefined);
  }, [savedNamespaces]);

  const prefixesForCheck = useMemo(
    () => (allowedNamespacePrefixes.length > 0 ? allowedNamespacePrefixes : null),
    [allowedNamespacePrefixes]
  );

  const isDirty = useMemo(
    () => !setsEqual(draftNamespaces, savedNamespaces),
    [draftNamespaces, savedNamespaces]
  );

  const selectedOptions = useMemo(() => toOptions(draftNamespaces), [draftNamespaces]);

  const handleCreate = useCallback(
    (rawInput: string) => {
      const newNamespace = rawInput.trim();
      if (!newNamespace) {
        return;
      }
      if (draftNamespaces.includes(newNamespace)) {
        return;
      }

      const { valid, error } = isValidNamespace(newNamespace);
      if (!valid) {
        setValidationError(error);
        return;
      }
      if (!isNamespaceAllowedByPrefixes(newNamespace, prefixesForCheck)) {
        setValidationError(
          i18n.translate(
            'xpack.fleet.integrations.settings.namespaceCustomization.notAllowedPrefixError',
            {
              defaultMessage:
                'Namespace must start with one of the allowed prefixes for this space: {prefixes}',
              values: { prefixes: allowedNamespacePrefixes.join(', ') },
            }
          )
        );
        return;
      }
      setValidationError(undefined);
      setDraftNamespaces([...draftNamespaces, newNamespace]);
    },
    [draftNamespaces, prefixesForCheck, allowedNamespacePrefixes]
  );

  const handleChange = useCallback((next: Array<EuiComboBoxOptionOption<string>>) => {
    setValidationError(undefined);
    setDraftNamespaces(next.map((option) => option.value ?? option.label));
  }, []);

  const handleSave = useCallback(() => {
    onSave(draftNamespaces);
  }, [draftNamespaces, onSave]);

  const handleDiscard = useCallback(() => {
    setDraftNamespaces(savedNamespaces);
    setValidationError(undefined);
  }, [savedNamespaces]);

  return (
    <>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.fleet.integrations.settings.namespaceCustomization.title"
            defaultMessage="Namespace customization"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.fleet.integrations.settings.namespaceCustomization.description"
          defaultMessage="Opt in namespaces to apply namespace-level customization for this integration. Fleet will create dedicated index templates for each opted-in namespace."
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow
        isInvalid={!!validationError}
        error={validationError}
        label={i18n.translate('xpack.fleet.integrations.settings.namespaceCustomization.label', {
          defaultMessage: 'Namespaces opted in for customization',
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
          isInvalid={!!validationError}
          placeholder={i18n.translate(
            'xpack.fleet.integrations.settings.namespaceCustomization.placeholder',
            { defaultMessage: 'Add a namespace' }
          )}
          selectedOptions={selectedOptions}
          onCreateOption={handleCreate}
          onChange={handleChange}
        />
      </EuiFormRow>
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
                  <EuiIcon type="clock" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <FormattedMessage
                    id="xpack.fleet.integrations.settings.namespaceCustomization.applying"
                    defaultMessage="Applying namespace customization changes…"
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
                  disabled={!!validationError || disabled}
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
