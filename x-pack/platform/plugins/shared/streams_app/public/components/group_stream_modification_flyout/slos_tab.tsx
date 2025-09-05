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

export function SlosTab({ formData, setFormData }: TabProps) {
  const {
    core: { http },
  } = useKibana();

  const [query, setQuery] = useState('');
  const [foundSlos, setFoundSlos] = useState<Array<{ name: string; id: string }>>([]);

  const fetchSlos = React.useCallback(
    async (search: string = '') => {
      // WARN: Streams plugin doesn't depend on SLO plugin
      const response: { results: Array<{ id: string; name: string }> } = await http.get(
        '/api/observability/slos',
        {
          query: {
            page: 1,
            perPage: 5000,
            kqlQuery: search,
          },
        }
      );

      setFoundSlos(
        response.results.map((rule: { id: string; name: string }) => ({
          id: rule.id,
          name: rule.name,
        }))
      );
    },
    [http]
  );

  useEffect(() => {
    fetchSlos();
  }, [fetchSlos]);

  const handleQueryChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    fetchSlos(event.target.value);
  };

  const onSelectionChange = (newSelectedItems: { id: string; name: string }[]) => {
    setFormData({
      ...formData,
      slos: newSelectedItems,
    });
  };

  const availableSlos = foundSlos.filter((slo) => {
    const matchesQuery = query === '' || slo.name.toLowerCase().includes(query.toLowerCase());
    const alreadySelected = formData.slos.some((item) => item.id === slo.id);
    return matchesQuery && !alreadySelected;
  });

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          {i18n.translate('xpack.streams.groupStreamModificationFlyout.selectedSlosLabel', {
            defaultMessage: 'Selected',
          })}
          <EuiSpacer size="m" />
          {formData.slos.length === 0
            ? i18n.translate('xpack.streams.groupStreamModificationFlyout.noSelectedSlosLabel', {
                defaultMessage: 'No SLOs selected',
              })
            : formData.slos.map((slo) => (
                <EuiFlexGroup key={slo.id} gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="cross"
                      color="danger"
                      aria-label={i18n.translate(
                        'xpack.streams.groupStreamModificationFlyout.removeSloButtonLabel',
                        { defaultMessage: 'Remove' }
                      )}
                      onClick={() => {
                        const newSelected = formData.slos.filter((d) => d.id !== slo.id);
                        onSelectionChange(newSelected);
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={1}>{slo.name}</EuiFlexItem>
                </EuiFlexGroup>
              ))}
        </EuiFlexItem>

        <EuiFlexItem>
          {i18n.translate('xpack.streams.groupStreamModificationFlyout.availableSlosLabel', {
            defaultMessage: 'Available',
          })}
          <EuiSpacer size="m" />
          <EuiFieldText
            placeholder={i18n.translate(
              'xpack.streams.groupStreamModificationFlyout.sloFilterPlaceholder',
              { defaultMessage: 'Filter by name...' }
            )}
            value={query}
            onChange={handleQueryChange}
          />
          <EuiSpacer size="m" />
          {availableSlos.length === 0
            ? query
              ? i18n.translate('xpack.streams.groupStreamModificationFlyout.noSlosFoundLabel', {
                  defaultMessage: 'No SLOs found',
                })
              : i18n.translate('xpack.streams.groupStreamModificationFlyout.noAvailableSlosLabel', {
                  defaultMessage: 'No available SLOs',
                })
            : availableSlos.map((slo) => (
                <React.Fragment key={slo.id}>
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="plusInCircle"
                        aria-label={i18n.translate(
                          'xpack.streams.groupStreamModificationFlyout.addSloButtonLabel',
                          { defaultMessage: 'Add' }
                        )}
                        onClick={() => {
                          onSelectionChange([...formData.slos, slo]);
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={1}>{slo.name}</EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiSpacer size="m" />
                </React.Fragment>
              ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
