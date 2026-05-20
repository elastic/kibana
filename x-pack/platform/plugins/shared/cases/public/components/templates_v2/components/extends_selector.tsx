/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
} from '@elastic/eui';
import { parse } from 'yaml';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesEditTemplateNavigation } from '../../../common/navigation/hooks';
import { useGetTemplates } from '../hooks/use_get_templates';
import { useGetTemplate } from '../hooks/use_get_template';
import { setYamlExtends, removeYamlExtends } from '../utils/update_yaml_extends';
import { EXTENDS_LABEL, EXTENDS_SELECTOR_PLACEHOLDER, VIEW_PARENT_TEMPLATE } from '../translations';

interface ExtendsSelectorProps {
  yamlValue: string;
  onYamlChange: (value: string) => void;
  currentTemplateId?: string;
}

type TemplateOption = EuiComboBoxOptionOption<string>;

const SINGLE_SELECTION = { asPlainText: true };

export const ExtendsSelector: React.FC<ExtendsSelectorProps> = ({
  yamlValue,
  onYamlChange,
  currentTemplateId,
}) => {
  const { owner } = useCasesContext();
  const { data: templatesData, isLoading } = useGetTemplates({
    queryParams: { page: 1, perPage: 10000, owner, isEnabled: true },
  });
  const { getCasesEditTemplateUrl } = useCasesEditTemplateNavigation();

  const options = useMemo<TemplateOption[]>(() => {
    if (!templatesData?.templates) {
      return [];
    }
    return templatesData.templates.reduce<TemplateOption[]>((acc, t) => {
      if (t.templateId !== currentTemplateId) {
        acc.push({ label: t.name, value: t.templateId });
      }
      return acc;
    }, []);
  }, [templatesData, currentTemplateId]);

  const currentExtendsId = useMemo(() => {
    try {
      const parsed = parse(yamlValue);
      const ext =
        parsed && typeof parsed === 'object'
          ? (parsed as Record<string, unknown>).extends
          : undefined;
      return typeof ext === 'string' ? ext : undefined;
    } catch {
      return undefined;
    }
  }, [yamlValue]);

  const matchedOption = useMemo(
    () => options.find((o) => o.value === currentExtendsId),
    [options, currentExtendsId]
  );

  const isExtendsMissingFromOptions = currentExtendsId !== undefined && !matchedOption;

  const { data: deletedParent } = useGetTemplate(
    isExtendsMissingFromOptions ? currentExtendsId : undefined,
    undefined,
    { silent: true, includeDeleted: true }
  );

  const selectedOptions = useMemo<TemplateOption[]>(() => {
    if (!currentExtendsId) {
      return [];
    }
    if (matchedOption) {
      return [matchedOption];
    }
    const fallbackLabel = deletedParent?.definition?.name ?? currentExtendsId;
    return [{ label: fallbackLabel, value: currentExtendsId }];
  }, [currentExtendsId, matchedOption, deletedParent]);

  const handleChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      const picked = selected[0];
      if (picked?.value) {
        onYamlChange(setYamlExtends(yamlValue, picked.value));
      } else {
        onYamlChange(removeYamlExtends(yamlValue));
      }
    },
    [yamlValue, onYamlChange]
  );

  return (
    <>
      <EuiFormRow label={EXTENDS_LABEL} display="rowCompressed" fullWidth>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiComboBox<string>
              compressed
              fullWidth
              isClearable
              singleSelection={SINGLE_SELECTION}
              isLoading={isLoading}
              options={options}
              selectedOptions={selectedOptions}
              onChange={handleChange}
              placeholder={EXTENDS_SELECTOR_PLACEHOLDER}
              data-test-subj="template-extends-selector"
            />
          </EuiFlexItem>
          {currentExtendsId && (
            <EuiFlexItem grow={false}>
              <EuiLink
                href={getCasesEditTemplateUrl({ templateId: currentExtendsId })}
                data-test-subj="template-extends-view-link"
              >
                {VIEW_PARENT_TEMPLATE}
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiHorizontalRule margin="s" />
    </>
  );
};

ExtendsSelector.displayName = 'ExtendsSelector';
