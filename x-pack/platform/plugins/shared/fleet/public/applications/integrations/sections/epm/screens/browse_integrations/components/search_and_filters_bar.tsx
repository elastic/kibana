/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from '@emotion/styled';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';

import type { EuiSelectableOption } from '@elastic/eui';

import { useUrlFilters, useAddUrlFilters } from '../hooks/url_filters';
import type {
  BrowseIntegrationSortType,
  IntegrationStatusFilterType,
  SetupMethodFilterType,
  SignalFilterType,
} from '../types';
import { SETUP_METHOD_AGENTLESS, SETUP_METHOD_ELASTIC_AGENT } from '../types';
import { dataTypes } from '../../../../../../../../common/constants';
import { StatusFilter } from '../../../components/status_filter';

const SEARCH_DEBOUNCE_MS = 150;

export const StickyFlexItem = styled(EuiFlexItem)`
  position: sticky;
  background-color: ${(props) => props.theme.euiTheme.colors.backgroundBasePlain};
  z-index: ${(props) => props.theme.euiTheme.levels.menu};
  top: var(--kbn-application--sticky-headers-offset, var(--kbn-layout--header-height, '0px'));
  padding-top: ${(props) => props.theme.euiTheme.size.m};
`;

const SortFilter: React.FC = () => {
  const urlFilters = useUrlFilters();
  const addUrlFilters = useAddUrlFilters();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const togglePopover = useCallback(() => setIsOpen((prevIsOpen) => !prevIsOpen), []);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const options = useMemo(
    () => [
      // TODO enabled when supported
      // {
      //   label: i18n.translate(
      //     'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortByRecentOldOption',
      //     {
      //       defaultMessage: 'Recent-Old',
      //     }
      //   ),
      //   key: 'recent-old',
      // },
      // {
      //   label: i18n.translate(
      //     'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortByOldRecentOption',
      //     {
      //       defaultMessage: 'Old-Recent',
      //     }
      //   ),
      //   key: 'old-recent',
      // },
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortByAZOption',
          {
            defaultMessage: 'A-Z',
          }
        ),
        key: 'a-z',
        'data-test-subj': 'browseIntegrations.searchBar.sortByAZOption',
      },
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortByZAOption',
          {
            defaultMessage: 'Z-A',
          }
        ),
        key: 'z-a',
        'data-test-subj': 'browseIntegrations.searchBar.sortByZAOption',
      },
    ],
    []
  );

  const selectedOption = useMemo(() => {
    if (!urlFilters.sort) {
      return options[0];
    }

    return options.find((option) => option.key === urlFilters.sort) ?? options[0];
  }, [urlFilters.sort, options]);

  return (
    <EuiFilterGroup compressed>
      <EuiPopover
        id="browseIntegrationsSortPopover"
        isOpen={isOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        button={
          <EuiFilterButton
            data-test-subj="browseIntegrations.searchBar.sortBtn"
            iconType="arrowDown"
            onClick={togglePopover}
            isSelected={isOpen}
          >
            {selectedOption.label}
          </EuiFilterButton>
        }
      >
        <EuiSelectable
          searchable={false}
          singleSelection={true}
          options={options}
          onChange={(newOptions) => {
            const selected = newOptions.find((option) => option.checked);
            if (selected) {
              addUrlFilters({ sort: selected.key as BrowseIntegrationSortType });
              closePopover();
            }
          }}
          listProps={{
            paddingSize: 's',
            showIcons: false,
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

const SetupMethodFilter: React.FC<{
  selectedMethods?: SetupMethodFilterType[];
  onChange: (methods: SetupMethodFilterType[]) => void;
}> = ({ selectedMethods = [], onChange }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const togglePopover = useCallback(() => setIsOpen((prevIsOpen) => !prevIsOpen), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const options: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.setupMethodAgentlessOption',
          { defaultMessage: 'Agentless' }
        ),
        key: SETUP_METHOD_AGENTLESS,
        checked: selectedMethods.includes(SETUP_METHOD_AGENTLESS) ? 'on' : undefined,
        'data-test-subj': 'browseIntegrations.searchBar.setupMethodAgentlessOption',
      },
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.setupMethodElasticAgentOption',
          { defaultMessage: 'Elastic Agent' }
        ),
        key: SETUP_METHOD_ELASTIC_AGENT,
        checked: selectedMethods.includes(SETUP_METHOD_ELASTIC_AGENT) ? 'on' : undefined,
        'data-test-subj': 'browseIntegrations.searchBar.setupMethodElasticAgentOption',
      },
    ],
    [selectedMethods]
  );

  const activeCount = selectedMethods.length;

  const onSelectionChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newMethods: SetupMethodFilterType[] = [];
      newOptions.forEach((option) => {
        if (option.checked === 'on' && option.key) {
          newMethods.push(option.key as SetupMethodFilterType);
        }
      });
      onChange(newMethods);
    },
    [onChange]
  );

  return (
    <EuiPopover
      id="browseIntegrationsSetupMethodPopover"
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          data-test-subj="browseIntegrations.searchBar.setupMethodBtn"
          iconType="arrowDown"
          onClick={togglePopover}
          isSelected={isOpen}
          numFilters={activeCount}
          hasActiveFilters={activeCount > 0}
          numActiveFilters={activeCount}
        >
          <FormattedMessage
            id="xpack.fleet.epm.browseIntegrations.searchAndFilterBar.setupMethodLabel"
            defaultMessage="Setup method"
          />
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        data-test-subj="browseIntegrations.searchBar.setupMethodSelectableList"
        searchable={false}
        options={options}
        onChange={onSelectionChange}
        listProps={{
          paddingSize: 's',
          showIcons: true,
          style: { minWidth: 250 },
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};

const SignalFilter: React.FC<{
  selectedSignals?: SignalFilterType[];
  onChange: (signals: SignalFilterType[]) => void;
}> = ({ selectedSignals = [], onChange }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const togglePopover = useCallback(() => setIsOpen((prevIsOpen) => !prevIsOpen), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const options: EuiSelectableOption[] = useMemo(
    () => [
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.signalLogsOption',
          { defaultMessage: 'Logs' }
        ),
        key: dataTypes.Logs,
        checked: selectedSignals.includes(dataTypes.Logs) ? 'on' : undefined,
        'data-test-subj': 'browseIntegrations.searchBar.signalLogsOption',
      },
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.signalMetricsOption',
          { defaultMessage: 'Metrics' }
        ),
        key: dataTypes.Metrics,
        checked: selectedSignals.includes(dataTypes.Metrics) ? 'on' : undefined,
        'data-test-subj': 'browseIntegrations.searchBar.signalMetricsOption',
      },
      {
        label: i18n.translate(
          'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.signalTracesOption',
          { defaultMessage: 'Traces' }
        ),
        key: dataTypes.Traces,
        checked: selectedSignals.includes(dataTypes.Traces) ? 'on' : undefined,
        'data-test-subj': 'browseIntegrations.searchBar.signalTracesOption',
      },
    ],
    [selectedSignals]
  );

  const activeCount = selectedSignals.length;

  const onSelectionChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const newSignals: SignalFilterType[] = [];
      newOptions.forEach((option) => {
        if (option.checked === 'on' && option.key) {
          newSignals.push(option.key as SignalFilterType);
        }
      });
      onChange(newSignals);
    },
    [onChange]
  );

  return (
    <EuiPopover
      id="browseIntegrationsSignalPopover"
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          data-test-subj="browseIntegrations.searchBar.signalBtn"
          iconType="arrowDown"
          onClick={togglePopover}
          isSelected={isOpen}
          numFilters={activeCount}
          hasActiveFilters={activeCount > 0}
          numActiveFilters={activeCount}
        >
          <FormattedMessage
            id="xpack.fleet.epm.browseIntegrations.searchAndFilterBar.allSignalsLabel"
            defaultMessage="All signals"
          />
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        data-test-subj="browseIntegrations.searchBar.signalSelectableList"
        searchable={false}
        options={options}
        onChange={onSelectionChange}
        listProps={{
          paddingSize: 's',
          showIcons: true,
          style: { minWidth: 250 },
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};

const SearchBar: React.FC = () => {
  const urlFilters = useUrlFilters();
  const addUrlFilters = useAddUrlFilters();

  const [searchTerms, setSearchTerms] = useState(urlFilters.q);

  useDebounce(
    () => {
      addUrlFilters(
        {
          q: searchTerms,
        },
        { replace: true }
      );
    },
    SEARCH_DEBOUNCE_MS,
    [searchTerms]
  );

  return (
    <EuiFieldSearch
      compressed
      placeholder={i18n.translate(
        'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.searchPlaceholder',
        {
          defaultMessage: 'Search integrations',
        }
      )}
      value={searchTerms}
      data-test-subj="browseIntegrations.searchBar.input"
      onChange={(e) => setSearchTerms(e.target.value)}
      fullWidth
    />
  );
};

export const SearchAndFiltersBar: React.FC = ({}) => {
  const urlFilters = useUrlFilters();
  const addUrlFilters = useAddUrlFilters();

  const handleStatusChange = useCallback(
    (statuses: IntegrationStatusFilterType[]) => {
      addUrlFilters({ status: statuses.length > 0 ? statuses : undefined });
    },
    [addUrlFilters]
  );

  const handleSetupMethodChange = useCallback(
    (methods: SetupMethodFilterType[]) => {
      addUrlFilters({ setupMethod: methods.length > 0 ? methods : undefined });
    },
    [addUrlFilters]
  );

  const handleSignalChange = useCallback(
    (signals: SignalFilterType[]) => {
      addUrlFilters({ signal: signals.length > 0 ? signals : undefined });
    },
    [addUrlFilters]
  );

  return (
    <StickyFlexItem>
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
        <EuiFlexItem grow={true}>
          <SearchBar />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed>
            <SetupMethodFilter
              selectedMethods={urlFilters.setupMethod}
              onChange={handleSetupMethodChange}
            />
            <SignalFilter selectedSignals={urlFilters.signal} onChange={handleSignalChange} />

            <StatusFilter
              selectedStatuses={urlFilters.status}
              onChange={handleStatusChange}
              testSubjPrefix="browseIntegrations.searchBar"
              popoverId="browseIntegrationsStatusPopover"
            />
          </EuiFilterGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SortFilter />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </StickyFlexItem>
  );
};
