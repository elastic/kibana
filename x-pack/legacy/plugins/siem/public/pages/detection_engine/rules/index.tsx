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
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiTabbedContent,
} from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

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

      <section>
        <HeaderSection title="All rules">
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

              <UtilityBarAction>
                {'Batch actions'} <EuiIcon size="s" type="arrowDown" />
              </UtilityBarAction>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarAction>
                <EuiIcon size="s" type="cross" /> {'Clear 7 filters'}
              </UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>

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
                <EuiButtonIcon iconType="boxesVertical" />
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
                <EuiButtonIcon iconType="boxesVertical" />
              </TableCardsTd>
            </TableCardsRow>
          </TableCardsTbody>
        </TableCards>
      </section>
    </>
  );
});
AllRules.displayName = 'AllRules';

const ActivityMonitor = React.memo(() => {
  const columns = [
    {
      field: 'checkbox',
      name: 'Checkbox',
      truncateText: true,
    },
    {
      field: 'rule',
      name: 'Rule',
      truncateText: true,
    },
    {
      field: 'ran',
      name: 'Ran',
      truncateText: true,
    },
    {
      field: 'lookedBackTo',
      name: 'Looked back to',
      truncateText: true,
    },
    {
      field: 'status',
      name: 'Status',
      truncateText: true,
    },
    {
      field: 'response',
      name: 'Response',
      truncateText: true,
    },
    {
      field: 'actions',
      name: '',
    },
  ];

  const items = [
    {
      checkbox: 'test',
      rule: 'test',
      ran: 'test',
      lookedBackTo: 'test',
      status: 'test',
      response: 'test',
      actions: 'test',
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

              <UtilityBarAction>
                <EuiIcon size="s" type="stop" /> {'Stop selected'}
              </UtilityBarAction>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarAction>
                <EuiIcon size="s" type="cross" /> {'Clear 7 filters'}
              </UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>

        <EuiBasicTable items={items} columns={columns} />
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
