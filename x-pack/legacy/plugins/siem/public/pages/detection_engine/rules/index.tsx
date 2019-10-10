/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import React from 'react';

import { HeaderPage } from '../../../components/header_page';
import { SpyRoute } from '../../../utils/route/spy_routes';
import * as i18n from './translations';

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

      <EuiTabs>
        <EuiTab>{'All rules'}</EuiTab>
        <EuiTab>{'Activity monitor'}</EuiTab>
      </EuiTabs>

      <EuiSpacer />

      <section>
        <header>
          <div>
            <h2>{'All rules'}</h2>
          </div>

          <div>
            <EuiFieldSearch
              aria-label="Search rules"
              fullWidth
              placeholder="e.g. rule name or description"
            />
          </div>
        </header>

        <EuiSpacer />

        <aside>
          <div>
            <div>
              <p>{'Showing: 39 rules'}</p>
            </div>

            <div>
              <p>{'Selected: 2 rules'}</p>

              <button type="button">
                {'Batch actions'} <EuiIcon size="s" type="arrowDown" />
              </button>
            </div>

            <div>
              <button type="button">
                <EuiIcon size="s" type="cross" /> {'Clear 7 filters'}
              </button>
            </div>
          </div>
        </aside>

        <EuiSpacer />

        <table>
          <thead>
            <tr>
              <th scope="col">
                <EuiCheckbox
                  id="test"
                  onChange={() => {
                    return null;
                  }}
                />
              </th>
              <th scope="col">{'Rule'}</th>
              <th scope="col">{'Method'}</th>
              <th scope="col">{'Severity'}</th>
              <th scope="col">{'Last completed run'}</th>
              <th scope="col">{'Last response'}</th>
              <th scope="col">{'Tags'}</th>
              <th scope="col">{'Activate'}</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>
                <EuiCheckbox
                  id="test"
                  onChange={() => {
                    return null;
                  }}
                />
              </td>
              <th scope="row">
                <EuiLink href="#/detection-engine/rules/rule-details">
                  {'Automated exfiltration'}
                </EuiLink>{' '}
                <EuiBadge color="hollow">{'Experimental'}</EuiBadge>
              </th>
              <td>{'Kibana Query Language'}</td>
              <td>
                <EuiHealth color="warning">{'Medium'}</EuiHealth>
              </td>
              <td>
                <time>{'12/28/2019, 12:00 PM'}</time>
              </td>
              <td>
                <span>{'Success'}</span>
              </td>
              <td>
                <EuiBadge color="hollow">{'attack.t1234'}</EuiBadge>
              </td>
              <td>
                <EuiSwitch />
              </td>
              <td>
                <EuiButtonIcon iconType="boxesVertical" />
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <SpyRoute />
    </>
  );
});
RulesComponent.displayName = 'RulesComponent';
