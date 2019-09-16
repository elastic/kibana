/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiButtonEmpty, EuiButtonEmptyProps } from '@elastic/eui';
import styled from 'styled-components';
import { IntegrationInfo } from '../../../common/types';
import { entries } from '../../../common/type_utils';
import { DetailViewPanelName } from '../../';
import { useLinks } from '../../hooks';

export type NavLinkProps = Pick<IntegrationInfo, 'name' | 'version'> & {
  active: DetailViewPanelName;
};

const PanelDisplayNames: Record<DetailViewPanelName, string> = {
  overview: 'Overview',
  assets: 'Assets',
  'data-sources': 'Data Sources',
};

export function SideNavLinks({ name, version, active }: NavLinkProps) {
  const { toDetailView } = useLinks();

  return (
    <Fragment>
      {entries(PanelDisplayNames).map(([panel, display]) => {
        const Link = styled(EuiButtonEmpty).attrs<EuiButtonEmptyProps>({
          href: toDetailView({ name, version, panel }),
        })`
          font-weight: ${p =>
            active === panel
              ? p.theme.eui.euiFontWeightSemiBold
              : p.theme.eui.euiFontWeightRegular};
        `;
        return (
          <div key={panel}>
            <Link>{display}</Link>
          </div>
        );
      })}
    </Fragment>
  );
}
