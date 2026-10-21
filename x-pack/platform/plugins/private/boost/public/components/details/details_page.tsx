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
  EuiCallOut,
  EuiEmptyPrompt,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
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
  /** Shown above the details, such as when advanced mode is off. */
  notice?: ReactNode;
  children?: ReactNode;
}

/** A boost rule's or profile's details page: its header, with a way back to its list. */
export const DetailsPage = ({
  list,
  name,
  isFound,
  badges,
  menu,
  notice,
  children,
}: DetailsPageProps) => {
  const { appParams, chrome } = useBoostServices();
  const history = useHistory();
  const listLabel = LIST_LABELS[list];
  const listPath = `/${list}`;

  useEffect(() => {
    // Links are relative to this app, which the management app scopes them to.
    appParams.setBreadcrumbs([
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
      <EuiSpacer size="l" />
      <EuiPageSection paddingSize="none" color="transparent" restrictWidth>
        {isFound ? (
          <>
            {notice && (
              <>
                {notice}
                <EuiSpacer size="l" />
              </>
            )}
            {children}
          </>
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

interface DetailsSectionProps {
  title: string;
  /** Shown at the title's end, such as a button. */
  titleAppend?: ReactNode;
  children: ReactNode;
  'data-test-subj'?: string;
}

const DetailsTitle = ({
  title,
  titleAppend,
}: Pick<DetailsSectionProps, 'title' | 'titleAppend'>) => (
  <>
    <div css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <EuiTitle size="xs">
        <h2>{title}</h2>
      </EuiTitle>
      {titleAppend}
    </div>
    <EuiSpacer size="m" />
  </>
);

/** A titled section of a details page without a panel, such as a table, which has its own lines. */
export const DetailsSection = ({
  title,
  titleAppend,
  children,
  'data-test-subj': dataTestSubj,
}: DetailsSectionProps) => (
  <div data-test-subj={dataTestSubj}>
    <DetailsTitle title={title} titleAppend={titleAppend} />
    {children}
  </div>
);

interface DetailsPanelProps extends DetailsSectionProps {
  /** Fills its row's height, so panels side by side line up. */
  fillsHeight?: boolean;
}

/** A titled section of a details page, in a panel. */
export const DetailsPanel = ({
  title,
  fillsHeight = false,
  titleAppend,
  children,
  'data-test-subj': dataTestSubj,
}: DetailsPanelProps) => (
  <EuiPanel
    hasBorder
    hasShadow={false}
    css={fillsHeight ? { blockSize: '100%' } : undefined}
    data-test-subj={dataTestSubj}
  >
    <DetailsTitle title={title} titleAppend={titleAppend} />
    {children}
  </EuiPanel>
);

/** Says that advanced mode is off, so custom rules don't apply. Details show advanced mode. */
export const SimpleModeNotice = ({ children }: { children: ReactNode }) => (
  <EuiCallOut
    size="s"
    iconType="info"
    title={i18n.translate('xpack.boost.details.simpleModeTitle', {
      defaultMessage: 'Advanced mode is off',
    })}
    data-test-subj="boostDetailsSimpleModeNotice"
  >
    <p>{children}</p>
  </EuiCallOut>
);
