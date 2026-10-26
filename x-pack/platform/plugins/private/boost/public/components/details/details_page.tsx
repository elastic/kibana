/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiPageSection,
  EuiSpacer,
  EuiTitle,
  useEuiMaxBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import type { AppHeaderProps } from '@kbn/app-header';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { useBoostServices } from '../../hooks/use_boost_services';
import { BOOST_APP_TITLE } from '../../translations';

type DetailsList = 'rules' | 'profiles';

const LIST_LABELS: Readonly<Record<DetailsList, string>> = {
  rules: i18n.translate('xpack.boost.details.rulesList', { defaultMessage: 'Boost rules' }),
  profiles: i18n.translate('xpack.boost.details.profilesList', {
    defaultMessage: 'Boost profiles',
  }),
};

const NOT_FOUND_TITLES: Readonly<Record<DetailsList, string>> = {
  rules: i18n.translate('xpack.boost.details.ruleNotFound', {
    defaultMessage: 'Boost rule not found',
  }),
  profiles: i18n.translate('xpack.boost.details.profileNotFound', {
    defaultMessage: 'Boost profile not found',
  }),
};

interface DetailsPageProps {
  /** The list the page belongs to, which its back link and breadcrumbs return to. */
  list: DetailsList;
  name: string;
  /** Whether the rule or profile exists. Without it, the page says it wasn't found. */
  isFound: boolean;
  badges?: AppHeaderProps['badges'];
  menu?: AppHeaderProps['menu'];
  /** The details, in bands between dividers. */
  children?: ReactNode;
}

/** A boost rule's or profile's details page: its header, with a way back to its list. */
export const DetailsPage = ({ list, name, isFound, badges, menu, children }: DetailsPageProps) => {
  const { appParams, chrome } = useBoostServices();
  const history = useHistory();
  const listLabel = LIST_LABELS[list];
  const listPath = `/${list}`;

  useEffect(() => {
    // Links are relative to this app, which the management app scopes them to.
    appParams?.setBreadcrumbs([
      { text: BOOST_APP_TITLE, href: '/' },
      { text: listLabel, href: listPath },
      { text: name },
    ]);
    chrome.docTitle.change([name, BOOST_APP_TITLE]);
  }, [appParams, chrome, listLabel, listPath, name]);

  return (
    <>
      <AppHeader
        title={name}
        back={{ href: history.createHref({ pathname: listPath }), label: listLabel }}
        badges={isFound ? badges : undefined}
        menu={isFound ? menu : undefined}
        spacing="bleed"
      />
      {/* Bands start with their own padding, so a band's dividers meet the header's border. */}
      {!isFound && <EuiSpacer size="l" />}
      <EuiPageSection paddingSize="none" color="transparent" restrictWidth>
        {isFound ? (
          children
        ) : (
          <EuiEmptyPrompt
            iconType="search"
            title={<h2>{NOT_FOUND_TITLES[list]}</h2>}
            body={
              <p>
                {i18n.translate('xpack.boost.details.notFoundBody', {
                  defaultMessage: 'It may have been deleted, or the link may be wrong.',
                })}
              </p>
            }
            actions={
              <EuiButton {...reactRouterNavigate(history, listPath)}>
                {i18n.translate('xpack.boost.details.backToList', {
                  defaultMessage: 'Back to {list}',
                  values: { list: listLabel.toLowerCase() },
                })}
              </EuiButton>
            }
            data-test-subj="boostDetailsNotFound"
          />
        )}
      </EuiPageSection>
    </>
  );
};

interface DetailsBandProps {
  /** Whether a divider follows the band, which the last band leaves out. */
  hasDivider?: boolean;
  children: ReactNode;
  'data-test-subj'?: string;
}

/** A section of a banded details page, with a divider below. */
export const DetailsBand = ({
  hasDivider = true,
  children,
  'data-test-subj': dataTestSubj,
}: DetailsBandProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={{
        paddingBlock: euiTheme.size.l,
        borderBlockEnd: hasDivider ? euiTheme.border.thin : undefined,
      }}
      data-test-subj={dataTestSubj}
    >
      {children}
    </div>
  );
};

interface DetailsSplitBandProps {
  start: ReactNode;
  end: ReactNode;
  /** Whether a divider follows the band, which the last band leaves out. */
  hasDivider?: boolean;
}

/**
 * Two sections side by side in a band, with a divider between them that runs the band's height.
 * On narrow screens they stack, with a divider between them.
 */
export const DetailsSplitBand = ({ start, end, hasDivider = true }: DetailsSplitBandProps) => {
  const { euiTheme } = useEuiTheme();
  const narrow = useEuiMaxBreakpoint('m');
  return (
    <div
      css={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        borderBlockEnd: hasDivider ? euiTheme.border.thin : undefined,
        [narrow]: { gridTemplateColumns: '1fr' },
      }}
    >
      <div css={{ paddingBlock: euiTheme.size.l, paddingInlineEnd: euiTheme.size.l }}>{start}</div>
      <div
        css={{
          paddingBlock: euiTheme.size.l,
          paddingInlineStart: euiTheme.size.l,
          borderInlineStart: euiTheme.border.thin,
          [narrow]: {
            paddingInlineStart: 0,
            borderInlineStart: 'none',
            borderBlockStart: euiTheme.border.thin,
          },
        }}
      >
        {end}
      </div>
    </div>
  );
};

interface DetailsSectionProps {
  title: string;
  /** Shown at the title's end, such as a button. */
  titleAppend?: ReactNode;
  /**
   * Keeps the title as tall as a small button, even without one, so it lines up with a section
   * beside it that has one.
   */
  reservesButtonSpace?: boolean;
  children: ReactNode;
  'data-test-subj'?: string;
}

const DetailsTitle = ({
  title,
  titleAppend,
  reservesButtonSpace = false,
}: Pick<DetailsSectionProps, 'title' | 'titleAppend' | 'reservesButtonSpace'>) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      {/* Controls beside the title wrap below it when they don't fit. */}
      <div
        css={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: euiTheme.size.m,
          minBlockSize: reservesButtonSpace ? euiTheme.size.xl : undefined,
        }}
      >
        <EuiTitle size="xs">
          <h2>{title}</h2>
        </EuiTitle>
        {titleAppend}
      </div>
      <EuiSpacer size="m" />
    </>
  );
};

/** A titled section of a details page, such as in a band. */
export const DetailsSection = ({
  title,
  titleAppend,
  reservesButtonSpace,
  children,
  'data-test-subj': dataTestSubj,
}: DetailsSectionProps) => (
  <div data-test-subj={dataTestSubj}>
    <DetailsTitle
      title={title}
      titleAppend={titleAppend}
      reservesButtonSpace={reservesButtonSpace}
    />
    {children}
  </div>
);
