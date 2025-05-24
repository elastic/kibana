import { EuiIcon } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React from 'react';

const styles = {
  icon: css({
    marginTop: '5px',
  }),
};

/**
 * Retrieve the IgnoreGlobalfilter shared icon to be put into the dataViewPicker within a Layer panel
 * @param dataTestSubj test id to be applied
 * @returns
 */
export const getIgnoreGlobalFilterIcon = ({
  color,
  dataTestSubj,
}: {
  color: string;
  dataTestSubj: string;
}) => {
  return {
    component: (
      <EuiIcon
        type="filterIgnore"
        color={color}
        className={styles.icon}
      />
    ),
    tooltipValue: i18n.translate('xpack.lens.layerPanel.ignoreGlobalFilters', {
      defaultMessage: 'Ignore global filters',
    }),
    'data-test-subj': dataTestSubj,
  };
};
