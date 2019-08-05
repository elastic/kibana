/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent, ReactNode, useState, useEffect } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPage,
  EuiPageBody,
  EuiPageWidthProps,
  EuiPanel,
  EuiText,
  EuiTitle,
  ICON_TYPES,
  IconType,
} from '@elastic/eui';

const ICON_HEIGHT_PANEL = 164;
const ICON_HEIGHT_NATURAL = 32;

import { PLUGIN } from '../../common/constants';
import { IntegrationInfo } from '../../common/types';
import { getIntegrationInfoByKey } from '../data';
import { useBreadcrumbs, useLinks } from '../hooks';

// Add stuff here as needed to help determine what the API should return
type IntegrationInfoWIP = IntegrationInfo & { title: string };
export function Detail(props: { package: string }) {
  const [info, setInfo] = useState<IntegrationInfoWIP | null>(null);
  useEffect(() => {
    getIntegrationInfoByKey(props.package).then(response => {
      const { description } = response;
      // TODO: Need title or something which uses correct capitalization (e.g. PostgreSQL)
      // Add to API
      const title = description.split(' ')[0];
      setInfo({ ...response, title });
    });
  }, [props.package]);

  // don't have designs for loading/empty states
  if (!info) return null;

  return <DetailLayout restrictWidth={1200} {...info} />;
}

type LayoutProps = IntegrationInfoWIP & EuiPageWidthProps;
function DetailLayout(props: LayoutProps) {
  const { name, restrictWidth, title } = props;
  const { toListView } = useLinks();
  const iconType = ICON_TYPES.find(key => key.toLowerCase() === `logo${name}`);
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }, { text: title }]);

  return (
    <>
      <EuiPage restrictWidth={restrictWidth} style={{ padding: '16px 16px 0 0' }}>
        <NavButtonBack />
      </EuiPage>
      <EuiPage style={{ borderBottom: '1px solid #D3DAE6', paddingBottom: '32px' }}>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Header iconType={iconType} {...props} />
        </EuiPageBody>
      </EuiPage>
      <EuiPage style={{ backgroundColor: 'white' }}>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Content hasLogoPanel={!!iconType} {...props} />
        </EuiPageBody>
      </EuiPage>
    </>
  );
}

type HeaderProps = IntegrationInfoWIP & { iconType?: IconType };
function Header(props: HeaderProps) {
  const { iconType, title, version } = props;
  const [isInstalled, setInstalled] = useState(false);

  return (
    <EuiFlexGroup>
      {iconType ? (
        <LeftColumn>
          <IconPanel iconType={iconType} />
        </LeftColumn>
      ) : null}
      <CenterColumn>
        <EuiTitle size="l">
          <h1>
            <span style={{ marginRight: '1rem' }}>{title}</span>
            <EuiBadge color="hollow">v{version}</EuiBadge>
          </h1>
        </EuiTitle>
      </CenterColumn>
      <RightColumn>
        <EuiFlexGroup direction="column" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={!isInstalled}
              iconType={isInstalled ? '' : 'plusInCircle'}
              fullWidth={false}
              onClick={() => setInstalled(!isInstalled)}
            >
              {isInstalled ? 'Installed' : 'Add Integration'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </RightColumn>
    </EuiFlexGroup>
  );
}

type ContentProps = IntegrationInfoWIP & { hasLogoPanel: boolean };
function Content(props: ContentProps) {
  const { description, hasLogoPanel } = props;
  const marginTop = ICON_HEIGHT_PANEL / 2 + ICON_HEIGHT_NATURAL / 2;
  const leftStyles = hasLogoPanel ? { marginTop: `${marginTop}px` } : {};
  const headerGlobalNav = 49;
  const pageTopNav = /* line-height */ 24 + /* padding-top */ 16;
  const header = /* line-height */ 48 + /* padding-top */ 16 + /* padding-bottom */ 32;
  const unknown = 8;
  const topBarsTotal = headerGlobalNav + pageTopNav + header + unknown;

  return (
    <EuiFlexGroup style={{ height: `calc(100vh - ${topBarsTotal}px)` }}>
      <LeftColumn style={leftStyles}>
        <EuiTitle>
          <span>Vertical Tabs</span>
        </EuiTitle>
      </LeftColumn>
      <CenterColumn>
        <>
          <EuiTitle size="xs">
            <span>About</span>
          </EuiTitle>
          <EuiText>
            <p>{description}</p>
          </EuiText>
        </>
      </CenterColumn>
      <RightColumn />
    </EuiFlexGroup>
  );
}

interface ColumnProps {
  children?: ReactNode;
  style?: object;
}

const LeftColumn: FunctionComponent<ColumnProps> = ({ children, style }) => {
  return (
    <EuiFlexItem grow={2} style={style}>
      {children}
    </EuiFlexItem>
  );
};

const CenterColumn: FunctionComponent<ColumnProps> = ({ children }) => {
  return <EuiFlexItem grow={7}>{children}</EuiFlexItem>;
};

const RightColumn: FunctionComponent<ColumnProps> = ({ children }) => {
  return <EuiFlexItem grow={3}>{children}</EuiFlexItem>;
};

function IconPanel({ iconType }: { iconType: IconType }) {
  // use padding to push the icon to the center of the box before `scale()`ing up
  const padding = ICON_HEIGHT_PANEL / 2 - ICON_HEIGHT_NATURAL / 2;

  return (
    <EuiPanel
      style={{
        position: 'absolute',
        width: `${ICON_HEIGHT_PANEL}px`,
        height: `${ICON_HEIGHT_PANEL}px`,
        padding: `${padding}px`,
        textAlign: 'center',
        verticalAlign: 'middle',
      }}
    >
      <EuiIcon type={iconType} size="original" style={{ transform: 'scale(3)' }} />
    </EuiPanel>
  );
}

function NavButtonBack() {
  const { toListView } = useLinks();
  return (
    <EuiButtonEmpty
      href={toListView()}
      iconType="arrowLeft"
      size="xs"
      flush="left"
      style={{ marginRight: '32px' }}
    >
      Browse Integrations
    </EuiButtonEmpty>
  );
}
