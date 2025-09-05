/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiButtonIcon, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import type { TabProps } from './types';
import { useKibana } from '../../hooks/use_kibana';

export function RulesTab({ formData, setFormData }: TabProps) {
  const {
    core: { http },
  } = useKibana();

  const [query, setQuery] = useState('');
  const [foundRules, setFoundRules] = useState<Array<{ name: string; id: string }>>([]);

  const fetchRules = React.useCallback(
    async (search: string = '') => {
      const result: { data: Array<{ id: string; name: string }> } = await http.get(
        '/api/alerting/rules/_find',
        {
          query: {
            page: 1,
            per_page: 10000,
            search,
            search_fields: 'name',
          },
        }
      );

      setFoundRules(
        result.data.map((rule: { id: string; name: string }) => ({ id: rule.id, name: rule.name }))
      );
    },
    [http]
  );

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleQueryChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    fetchRules(event.target.value);
  };

  const onSelectionChange = (newSelectedItems: { id: string; name: string }[]) => {
    setFormData({
      ...formData,
      rules: newSelectedItems,
    });
  };

  const availableRules = foundRules.filter((rule) => {
    const matchesQuery = query === '' || rule.name.toLowerCase().includes(query.toLowerCase());
    const alreadySelected = formData.rules.some((item) => item.id === rule.id);
    return matchesQuery && !alreadySelected;
  });

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          {i18n.translate('xpack.streams.groupStreamModificationFlyout.selectedRulesLabel', {
            defaultMessage: 'Selected',
          })}
          <EuiSpacer size="m" />
          {formData.rules.length === 0
            ? i18n.translate('xpack.streams.groupStreamModificationFlyout.noSelectedRulesLabel', {
                defaultMessage: 'No rules selected',
              })
            : formData.rules.map((rule) => (
                <EuiFlexGroup key={rule.id} gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="cross"
                      color="danger"
                      aria-label={i18n.translate(
                        'xpack.streams.groupStreamModificationFlyout.removeRuleButtonLabel',
                        { defaultMessage: 'Remove' }
                      )}
                      onClick={() => {
                        const newSelected = formData.rules.filter((d) => d.id !== rule.id);
                        onSelectionChange(newSelected);
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={1}>{rule.name}</EuiFlexItem>
                </EuiFlexGroup>
              ))}
        </EuiFlexItem>

        <EuiFlexItem>
          {i18n.translate('xpack.streams.groupStreamModificationFlyout.availableRulesLabel', {
            defaultMessage: 'Available',
          })}
          <EuiSpacer size="m" />
          <EuiFieldText
            placeholder={i18n.translate(
              'xpack.streams.groupStreamModificationFlyout.ruleFilterPlaceholder',
              { defaultMessage: 'Filter by title...' }
            )}
            value={query}
            onChange={handleQueryChange}
          />
          <EuiSpacer size="m" />
          {availableRules.length === 0
            ? query
              ? i18n.translate('xpack.streams.groupStreamModificationFlyout.noRulesFoundLabel', {
                  defaultMessage: 'No rules found',
                })
              : i18n.translate(
                  'xpack.streams.groupStreamModificationFlyout.noAvailableRulesLabel',
                  {
                    defaultMessage: 'No available rules',
                  }
                )
            : availableRules.map((rule) => (
                <React.Fragment key={rule.id}>
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="plusInCircle"
                        aria-label={i18n.translate(
                          'xpack.streams.groupStreamModificationFlyout.addRuleButtonLabel',
                          { defaultMessage: 'Add' }
                        )}
                        onClick={() => {
                          onSelectionChange([...formData.rules, rule]);
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={1}>{rule.name}</EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="m" />
                </React.Fragment>
              ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
