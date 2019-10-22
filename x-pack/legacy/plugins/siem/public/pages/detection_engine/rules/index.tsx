/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIconTip,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiTabbedContent,
  EuiText,
} from '@elastic/eui';
import React, { useState } from 'react';
import styled, { css } from 'styled-components';

import { getEmptyTagValue } from '../../../components/empty_value';
import { HeaderPage } from '../../../components/header_page';
import { HeaderSection } from '../../../components/header_section';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../components/utility_bar';
import { SpyRoute } from '../../../utils/route/spy_routes';
import * as i18n from './translations';

const TableCards = styled.table.attrs({
  className: 'siemTableCards',
})`
  ${({ theme }) => css`
    display: block;
  `}
`;
TableCards.displayName = 'TableCards';

const TableCardsThead = styled.thead.attrs({
  className: 'siemTableCards__thead',
})`
  ${({ theme }) => css`
    display: block;
  `}
`;
TableCardsThead.displayName = 'TableCardsThead';

const TableCardsTbody = styled.tbody.attrs({
  className: 'siemTableCards__tbody',
})`
  ${({ theme }) => css`
    display: block;
  `}
`;
TableCardsTbody.displayName = 'TableCardsTbody';

const TableCardsRow = styled.tr.attrs({
  className: 'siemTableCards__tr',
})`
  ${({ theme }) => css`
    border-collapse: separate;
    display: table;
    table-layout: fixed;
    width: 100%;

    .siemTableCards__thead & {
      border: ${theme.eui.euiBorderWidthThin} solid transparent;
      border-left-width: ${theme.eui.euiSizeXS};
    }

    .siemTableCards__tbody & {
      background-color: ${theme.eui.euiColorEmptyShade};
      border: ${theme.eui.euiBorderThin};
      border-left-color: ${theme.eui.euiColorSuccess};
      border-left-width: ${theme.eui.euiSizeXS};
      border-radius: ${theme.eui.euiBorderRadius};
    }

    .siemTableCards__tbody & + & {
      margin-top: ${theme.eui.euiSizeS};
    }
  `}
`;
TableCardsRow.displayName = 'TableCardsRow';

const TableCardsTh = styled.th.attrs({
  className: 'siemTableCards__th',
})`
  ${({ theme }) => css`
    font-size: ${theme.eui.euiFontSizeXS};
    font-weight: ${theme.eui.euiFontWeightSemiBold};
    line-height: ${theme.eui.euiLineHeight};
    padding: ${theme.eui.paddingSizes.s};
    text-align: left;
    vertical-align: middle;

    .siemTableCards__tbody & {
      font-size: ${theme.eui.euiFontSizeS};
      font-weight: ${theme.eui.euiFontWeightRegular};
    }
  `}
`;
TableCardsTh.displayName = 'TableCardsTh';

const TableCardsTd = styled.td.attrs({
  className: 'siemTableCards__td',
})`
  ${({ theme }) => css`
    font-size: ${theme.eui.euiFontSizeS};
    line-height: ${theme.eui.euiLineHeight};
    padding: ${theme.eui.paddingSizes.s};
    vertical-align: middle;
  `}
`;
TableCardsTd.displayName = 'TableCardsTd';

const AllRules = React.memo(() => {
  return (
    <>
      <EuiSpacer />

      <HeaderSection split title="All rules">
        <EuiFieldSearch
          aria-label="Search rules"
          fullWidth
          placeholder="e.g. rule name or description"
        />
      </HeaderSection>

      <UtilityBar border>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText>{'Showing: 39 rules'}</UtilityBarText>
          </UtilityBarGroup>

          <UtilityBarGroup>
            <UtilityBarText>{'Selected: 2 rules'}</UtilityBarText>

            <UtilityBarAction popoverContent={<p>{'Batch actions context menu here.'}</p>}>
              {'Batch actions'}
            </UtilityBarAction>
          </UtilityBarGroup>

          <UtilityBarGroup>
            <UtilityBarAction iconType="cross">{'Clear 7 filters'}</UtilityBarAction>
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>

      {/* Example of potentially new TableCards component. This new table type may no longer be required for implementation, given the requirements changes that have been made over time. At present, the only afforded benefits of using it are 1) differentiation from regular tables and 2) the presence of a colored status bar on the left of each row. Neither are dealbreakers in my mind. If creating a new table component is out of the question for MVP, go with a standard EUI basic table. */}

      <TableCards>
        <TableCardsThead>
          <TableCardsRow>
            <TableCardsTh scope="col" style={{ width: '32px' }}>
              <EuiCheckbox
                id="test"
                onChange={() => {
                  return null;
                }}
              />
            </TableCardsTh>
            <TableCardsTh scope="col">{'Rule'}</TableCardsTh>
            <TableCardsTh scope="col">{'Method'}</TableCardsTh>
            <TableCardsTh scope="col">{'Severity'}</TableCardsTh>
            <TableCardsTh scope="col">{'Last completed run'}</TableCardsTh>
            <TableCardsTh scope="col">{'Last response'}</TableCardsTh>
            <TableCardsTh scope="col">{'Tags'}</TableCardsTh>
            <TableCardsTh scope="col" style={{ width: '48px' }}>
              {'Activate'}
            </TableCardsTh>
            <TableCardsTh scope="col" style={{ width: '40px' }}></TableCardsTh>
          </TableCardsRow>
        </TableCardsThead>

        <TableCardsTbody>
          <TableCardsRow>
            <TableCardsTd style={{ width: '32px' }}>
              <EuiCheckbox
                id="test"
                onChange={() => {
                  return null;
                }}
              />
            </TableCardsTd>
            <TableCardsTh scope="row">
              <EuiLink href="#/detection-engine/rules/rule-details">
                {'Automated exfiltration'}
              </EuiLink>{' '}
              <EuiBadge color="hollow">{'Experimental'}</EuiBadge>
            </TableCardsTh>
            <TableCardsTd>{'Kibana Query Language'}</TableCardsTd>
            <TableCardsTd>
              <EuiHealth color="warning">{'Medium'}</EuiHealth>
            </TableCardsTd>
            <TableCardsTd>
              <time>{'12/28/2019, 12:00 PM'}</time>
            </TableCardsTd>
            <TableCardsTd>
              <span>{'Success'}</span>
            </TableCardsTd>
            <TableCardsTd>
              <EuiBadge color="hollow">{'attack.t1234'}</EuiBadge>
            </TableCardsTd>
            <TableCardsTd style={{ width: '48px' }}>
              <EuiSwitch />
            </TableCardsTd>
            <TableCardsTd style={{ width: '40px' }}>
              <EuiButtonIcon aria-label="Rule options" iconType="boxesVertical" />
            </TableCardsTd>
          </TableCardsRow>

          <TableCardsRow>
            <TableCardsTd style={{ width: '32px' }}>
              <EuiCheckbox
                id="test"
                onChange={() => {
                  return null;
                }}
              />
            </TableCardsTd>
            <TableCardsTh scope="row">
              <EuiLink href="#/detection-engine/rules/rule-details">
                {'Automated exfiltration'}
              </EuiLink>{' '}
              <EuiBadge color="hollow">{'Experimental'}</EuiBadge>
            </TableCardsTh>
            <TableCardsTd>{'Kibana Query Language'}</TableCardsTd>
            <TableCardsTd>
              <EuiHealth color="warning">{'Medium'}</EuiHealth>
            </TableCardsTd>
            <TableCardsTd>
              <time>{'12/28/2019, 12:00 PM'}</time>
            </TableCardsTd>
            <TableCardsTd>
              <span>{'Fail'}</span>
            </TableCardsTd>
            <TableCardsTd>
              <EuiBadge color="hollow">{'attack.t1234'}</EuiBadge>
            </TableCardsTd>
            <TableCardsTd style={{ width: '48px' }}>
              <EuiSwitch />
            </TableCardsTd>
            <TableCardsTd style={{ width: '40px' }}>
              <EuiButtonIcon aria-label="Rule options" iconType="boxesVertical" />
            </TableCardsTd>
          </TableCardsRow>
        </TableCardsTbody>
      </TableCards>
    </>
  );
});
AllRules.displayName = 'AllRules';

const ActivityMonitor = React.memo(() => {
  interface ColumnTypes {
    id: number;
    rule: string;
    ran: string;
    lookedBackTo: string;
    status: string;
    actions: string;
  }

  interface SortTypes {
    field: string;
    direction: string;
  }

  const [selectedState, setSelectedState] = useState<ColumnTypes[]>([]);
  const [sortState, setSortState] = useState<SortTypes>({ field: 'ran', direction: 'desc' });

  // const actions = [
  //   {
  //     render: (item = {}) => {
  //       if (item.status === 'Running') {
  //         return <EuiLink color="danger">{'Stop'}</EuiLink>;
  //       } else if (item.status === 'Stopped') {
  //         return <EuiLink color="danger">{'Resume'}</EuiLink>;
  //       } else {
  //         return <p>{'Nada'}</p>;
  //       }
  //     },
  //   },
  // ];

  const actions = [
    {
      available: (item: ColumnTypes) => (item.status === 'Running' ? true : false),
      name: 'Stop',
      isPrimary: true,
      description: 'Stop rule from running',
      icon: 'stop',
      type: 'button',
      onClick: () => {},
    },
    {
      available: (item: ColumnTypes) => (item.status === 'Stopped' ? true : false),
      name: 'Resume',
      isPrimary: true,
      description: 'Resume running rule',
      icon: 'play',
      type: 'button',
      onClick: () => {},
    },
  ];

  const columns = [
    {
      field: 'rule',
      name: 'Rule',
      render: (value: string) => (
        <EuiLink href="#/detection-engine/rules/rule-details">{value}</EuiLink>
      ),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'ran',
      name: 'Ran',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'lookedBackTo',
      name: 'Looked back to',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'status',
      name: 'Status',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'response',
      name: 'Response',
      render: (value: string | undefined) => {
        return value === undefined ? (
          getEmptyTagValue()
        ) : (
          <>
            {value === 'Fail' ? (
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiHealth color="danger">{value}</EuiHealth>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiIconTip content="Full fail message here." type="iInCircle" />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiHealth color="success">{value}</EuiHealth>
            )}
          </>
        );
      },
      sortable: true,
      truncateText: true,
    },
    {
      actions,
    },
  ];

  const sampleTableData = [
    {
      id: 1,
      rule: 'Automated exfiltration',
      ran: '12/28/2019, 12:00 PM',
      lookedBackTo: '12/28/2019, 12:00 PM',
      status: 'Running',
      actions: 'Stop',
    },
    {
      id: 2,
      rule: 'Automated exfiltration',
      ran: '12/28/2019, 12:00 PM',
      lookedBackTo: '12/28/2019, 12:00 PM',
      status: 'Stopped',
      actions: 'Resume',
    },
    {
      id: 3,
      rule: 'Automated exfiltration',
      ran: '12/28/2019, 12:00 PM',
      lookedBackTo: '12/28/2019, 12:00 PM',
      status: 'Completed',
      response: 'Fail',
    },
    {
      id: 4,
      rule: 'Automated exfiltration',
      ran: '12/28/2019, 12:00 PM',
      lookedBackTo: '12/28/2019, 12:00 PM',
      status: 'Completed',
      response: 'Success',
    },
  ];

  return (
    <>
      <EuiSpacer />

      <EuiPanel>
        <HeaderSection title="Activity monitor" />

        <UtilityBar border>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText>{'Showing: 39 activites'}</UtilityBarText>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarText>{'Selected: 2 activities'}</UtilityBarText>

              <UtilityBarAction iconType="stop">{'Stop selected'}</UtilityBarAction>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarAction iconType="cross">{'Clear 7 filters'}</UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>

        <EuiBasicTable
          columns={columns}
          isSelectable={true}
          itemId="id"
          items={sampleTableData}
          onChange={({ sort }: { sort: SortTypes }) => {
            setSortState(sort);
          }}
          selection={{
            selectable: (item: ColumnTypes) => item.status !== 'Completed',
            selectableMessage: (selectable: boolean) =>
              selectable ? undefined : 'Completed runs cannot be acted upon',
            onSelectionChange: (selectedItems: ColumnTypes[]) => {
              setSelectedState(selectedItems);
            },
          }}
          sorting={{
            sort: sortState,
          }}
        />
      </EuiPanel>
    </>
  );
});
AllRules.displayName = 'AllRules';

export const RulesComponent = React.memo(() => {
  return (
    <>
      <HeaderPage
        backOptions={{ href: '#detection-engine', text: 'Back to detection engine' }}
        subtitle="Last completed run: 23 minutes ago"
        title={i18n.PAGE_TITLE}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
          <EuiFlexItem grow={false}>
            <EuiButton href="#" iconType="importAction">
              {'Import rule…'}
            </EuiButton>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton fill href="#/detection-engine/rules/create-rule" iconType="plusInCircle">
              {'Add new rule'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </HeaderPage>

      <EuiTabbedContent
        tabs={[
          {
            id: 'tabAllRules',
            name: 'All rules',
            content: <AllRules />,
          },
          {
            id: 'tabActivityMonitor',
            name: 'Activity monitor',
            content: <ActivityMonitor />,
          },
        ]}
      />

      <SpyRoute />
    </>
  );
});
RulesComponent.displayName = 'RulesComponent';
