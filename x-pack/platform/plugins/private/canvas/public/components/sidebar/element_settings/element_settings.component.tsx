/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// @ts-expect-error unconverted component
import { Datasource } from '../../datasource';
// @ts-expect-error unconverted component
import { FunctionFormList } from '../../function_form_list';
import { PositionedElement } from '../../../../types';
import { WorkpadFilters } from '../../workpad_filters/workpad_filters';
import { isExpressionWithFilters } from '../../../lib/filter';

const strings = {
  getDataTabLabel: () =>
    i18n.translate('xpack.canvas.elementSettings.dataTabLabel', {
      defaultMessage: 'Data',
      description:
        'This tab contains the settings for the data (i.e. Elasticsearch query) used as ' +
        'the source for a Canvas element',
    }),
  getDisplayTabLabel: () =>
    i18n.translate('xpack.canvas.elementSettings.displayTabLabel', {
      defaultMessage: 'Display',
      description: 'This tab contains the settings for how data is displayed in a Canvas element',
    }),
  getFiltersTabLabel: () =>
    i18n.translate('xpack.canvas.elementSettings.filtersTabLabel', {
      defaultMessage: 'Filters',
      description: 'This tab contains information about filters related to a Canvas element',
    }),
};

interface Props {
  /**
   * a Canvas element used to populate config forms
   */
  element: PositionedElement;
}

export const ElementSettings: FunctionComponent<Props> = ({ element }) => {
  const tabs = useMemo(() => {
    const filtersTab = isExpressionWithFilters(element.expression) && {
      id: 'filters',
      name: strings.getFiltersTabLabel(),
      content: (
        <div className="canvasSidebar__pop">
          <WorkpadFilters element={element} />
        </div>
      ),
      'data-test-subj': 'canvasSidebarFiltersTab',
    };

    return [
      {
        id: 'edit',
        name: strings.getDisplayTabLabel(),
        content: (
          <div className="canvasSidebar__pop">
            <div className="canvasSidebar--args">
              <FunctionFormList element={element} />
            </div>
          </div>
        ),
        'data-test-subj': 'canvasSidebarDisplayTab',
      },
      {
        id: 'data',
        name: strings.getDataTabLabel(),
        content: (
          <div className="canvasSidebar__pop">
            <Datasource />
          </div>
        ),
        'data-test-subj': 'canvasSidebarDataTab',
      },
      ...(filtersTab ? [filtersTab] : []),
    ];
  }, [element]);

  const [selectedTab, setSelectedTab] = useState(tabs[0].id);

  const onSelectedTabChanged = (id: string) => {
    setSelectedTab(id);
  };

  const tabsHeaders = tabs.map((tab) => (
    <EuiTab
      key={tab.id}
      onClick={() => onSelectedTabChanged(tab.id)}
      isSelected={tab.id === selectedTab}
      data-test-subj={tab['data-test-subj']}
    >
      {tab.name}
    </EuiTab>
  ));

  const tabsContent = useMemo(
    () =>
      tabs.map(({ id, content }) =>
        id === selectedTab ? (
          content
        ) : (
          // tabs must be hidden, but mounted, because `Display` tab, for example,
          // contains args, which should react on input changes and change the expression,
          // according to the logic they encapsulate.
          // Good example: columns have changed, the args of expression `math` should be changed, containing the new columns.
          <div style={{ display: 'none' }}>{content}</div>
        )
      ),
    [selectedTab, tabs]
  );

  return (
    <>
      <EuiTabs size="s">{tabsHeaders}</EuiTabs>
      {tabsContent}
    </>
  );
};

ElementSettings.propTypes = {
  element: PropTypes.object,
};
