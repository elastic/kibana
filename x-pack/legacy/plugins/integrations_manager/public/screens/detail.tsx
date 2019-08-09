/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, FunctionComponent, ReactNode, useState, useEffect } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFacetButton,
  EuiFacetGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiNotificationBadge,
  EuiPage,
  EuiPageBody,
  EuiPageWidthProps,
  EuiPanel,
  EuiText,
  EuiTextColor,
  EuiTitle,
  ICON_TYPES,
  IconType,
  EuiSpacer,
} from '@elastic/eui';

const ICON_HEIGHT_PANEL = 164;
const ICON_HEIGHT_NATURAL = 32;

import { PLUGIN } from '../../common/constants';
import { entries } from '../../common/type_utils';
import { AssetsGroupedByServiceByType, IntegrationInfo, RequirementMap } from '../../common/types';
import { AssetIcons, AssetTitleMap, ServiceIcons, ServiceTitleMap } from '../constants';
import { VersionBadge } from '../components/version_badge';
import { getIntegrationInfoByKey } from '../data';
import { useBreadcrumbs, useLinks } from '../hooks';
import { DetailViewPanelName } from '..';

export interface DetailProps {
  pkgkey: string;
  panel?: DetailViewPanelName;
}

const DEFAULT_PANEL: DetailViewPanelName = 'overview';

export function Detail({ pkgkey, panel = DEFAULT_PANEL }: DetailProps) {
  const [info, setInfo] = useState<IntegrationInfo | null>(null);
  useEffect(() => {
    getIntegrationInfoByKey(pkgkey).then(response => {
      const { title } = response;
      setInfo({ ...response, title });
    });
  }, [pkgkey]);

  // don't have designs for loading/empty states
  if (!info) return null;

  return <DetailLayout restrictWidth={1200} {...info} panel={panel} />;
}

function overviewContentStyles() {
  const headerGlobalNav = 49;
  const pageTopNav = /* line-height */ 24 + /* padding-top */ 16;
  const header = /* line-height */ 48 + /* padding-top */ 16 + /* padding-bottom */ 32;
  const topBarsTotal = headerGlobalNav + pageTopNav + header;

  return {
    backgroundColor: 'white',
    height: `calc(100vh - ${topBarsTotal}px)`,
  };
}

type LayoutProps = IntegrationInfo & Pick<DetailProps, 'panel'> & EuiPageWidthProps;
function DetailLayout(props: LayoutProps) {
  const { name, restrictWidth, title, panel } = props;
  const { toListView } = useLinks();
  const iconType = ICON_TYPES.find(key => key.toLowerCase() === `logo${name}`);
  useBreadcrumbs([{ text: PLUGIN.TITLE, href: toListView() }, { text: title }]);

  const styles = panel === 'overview' ? overviewContentStyles() : {};

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
      <EuiPage style={styles}>
        <EuiPageBody restrictWidth={restrictWidth}>
          <Content hasLogoPanel={!!iconType} {...props} />
        </EuiPageBody>
      </EuiPage>
    </>
  );
}

type HeaderProps = IntegrationInfo & { iconType?: IconType };
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
            <VersionBadge version={version} />
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

type ContentProps = IntegrationInfo & Pick<DetailProps, 'panel'> & { hasLogoPanel: boolean };
function Content(props: ContentProps) {
  const { assets, description, hasLogoPanel, name, panel, requirement, version } = props;
  const marginTop = ICON_HEIGHT_PANEL / 2 + ICON_HEIGHT_NATURAL / 2;
  const leftStyles = hasLogoPanel ? { marginTop: `${marginTop}px` } : {};
  const isOverviewPanel = panel === 'overview';
  const panelContent = isOverviewPanel ? (
    <>
      <EuiTitle size="xs">
        <span>About</span>
      </EuiTitle>
      <EuiText>
        <p>{description}</p>
      </EuiText>
    </>
  ) : (
    <AssetAccordion assets={assets} />
  );

  return (
    <EuiFlexGroup>
      <LeftColumn style={leftStyles}>
        <NavLinks name={name} version={version} active={panel || DEFAULT_PANEL} />
      </LeftColumn>
      <CenterColumn>{panelContent}</CenterColumn>
      <RightColumn>
        {isOverviewPanel && (
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <Requirements requirements={requirement} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHorizontalRule margin="xl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AssetsFacetGroup assets={assets} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </RightColumn>
    </EuiFlexGroup>
  );
}

type NavLinkProps = Pick<IntegrationInfo, 'name' | 'version'> & { active: DetailViewPanelName };
function NavLinks({ name, version, active }: NavLinkProps) {
  const { toDetailView } = useLinks();
  const overviewLink = toDetailView({ name, version, panel: 'overview' });
  const assetsLink = toDetailView({ name, version, panel: 'assets' });
  const sourcesLink = toDetailView({ name, version, panel: 'data-sources' });
  const activeStyles = { fontWeight: 600 };

  return (
    <Fragment>
      <EuiButtonEmpty
        href={overviewLink}
        contentProps={{ style: { justifyContent: 'start' } }}
        style={active === 'overview' ? activeStyles : {}}
      >
        Overview
      </EuiButtonEmpty>
      <EuiButtonEmpty
        href={assetsLink}
        contentProps={{ style: { justifyContent: 'start' } }}
        style={active === 'assets' ? activeStyles : {}}
      >
        Assets
      </EuiButtonEmpty>
      <EuiButtonEmpty
        href={sourcesLink}
        contentProps={{ style: { justifyContent: 'start' } }}
        style={active === 'data-sources' ? activeStyles : {}}
      >
        Data Sources
      </EuiButtonEmpty>
    </Fragment>
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

interface RequirementsProps {
  requirements: RequirementMap;
}
function Requirements(props: RequirementsProps) {
  const { requirements } = props;

  return (
    <>
      <EuiTitle size="xs">
        <span style={{ paddingBottom: '16px' }}>Compatibility</span>
      </EuiTitle>
      {entries(requirements).map(([service, requirement]) => (
        <EuiFlexGroup key={service}>
          <EuiFlexItem grow={true}>
            <EuiTextColor color="subdued" key={service}>
              {ServiceTitleMap[service]}:
            </EuiTextColor>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <div>
              <VersionBadge version={requirement['version.min']} />
              <span>{' - '}</span>
              <VersionBadge version={requirement['version.max']} />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </>
  );
}

interface AssetsProps {
  assets: AssetsGroupedByServiceByType;
}

function AssetsFacetGroup(props: AssetsProps) {
  const { assets } = props;
  return (
    <Fragment>
      {entries(assets).map(([service, typeToParts], index) => {
        return (
          <Fragment key={service}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              style={{ padding: index === 0 ? '0 0 1em 0' : '1em 0' }}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type={ServiceIcons[service]} />
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiTitle key={service} size="xs">
                  <EuiText>
                    <h4>{ServiceTitleMap[service]} Assets</h4>
                  </EuiText>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiFacetGroup style={{ flexGrow: 0 }}>
              {entries(typeToParts).map(([type, parts]) => {
                const iconType = AssetIcons[type];
                const iconNode = iconType ? <EuiIcon type={iconType} size="s" /> : '';
                return (
                  <EuiFacetButton
                    key={type}
                    style={{ padding: '4px 0', height: 'unset' }}
                    quantity={parts.length}
                    icon={iconNode}
                    // https://github.com/elastic/eui/issues/2216
                    buttonRef={() => {}}
                  >
                    <EuiTextColor color="subdued">{AssetTitleMap[type]}</EuiTextColor>
                  </EuiFacetButton>
                );
              })}
            </EuiFacetGroup>
          </Fragment>
        );
      })}
    </Fragment>
  );
}

function AssetAccordion(props: AssetsProps) {
  const { assets } = props;

  return (
    <Fragment>
      {entries(assets).map(([service, typeToParts], assetIndex) => {
        return (
          <Fragment key={service}>
            <EuiPanel grow={false} paddingSize="none">
              <EuiFlexGroup gutterSize="s" alignItems="center" style={{ margin: '12px ' }}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={ServiceIcons[service]} />
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiTitle key={service}>
                    <EuiText>
                      <h4>{ServiceTitleMap[service]} Assets</h4>
                    </EuiText>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="none" />

              {entries(typeToParts).map(([type, parts], typeIndex, typeEntries) => {
                const iconType = AssetIcons[type];

                return (
                  <Fragment key={type}>
                    <EuiAccordion
                      style={{ margin: '12px ' }}
                      id={type}
                      buttonContent={
                        <EuiFlexGroup gutterSize="s" alignItems="center">
                          <EuiFlexItem grow={false}>
                            {iconType ? <EuiIcon type={iconType} size="s" /> : ''}
                          </EuiFlexItem>

                          <EuiFlexItem>
                            <EuiText color="secondary">{AssetTitleMap[type]}</EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      }
                      paddingSize="m"
                      extraAction={
                        <EuiNotificationBadge color="subdued" size="m">
                          {parts.length}
                        </EuiNotificationBadge>
                      }
                    >
                      <EuiText>
                        <span role="img" aria-label="woman shrugging">
                          🤷
                        </span>
                      </EuiText>
                    </EuiAccordion>
                    {typeIndex < typeEntries.length - 1 ? <EuiHorizontalRule margin="none" /> : ''}
                  </Fragment>
                );
              })}
            </EuiPanel>
            <EuiSpacer size="l" />
          </Fragment>
        );
      })}
    </Fragment>
  );
}
