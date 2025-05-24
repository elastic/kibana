import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  IconType,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';

export const StaticHeader = ({
  label,
  icon,
  indicator,
}: {
  label: string;
  icon?: IconType;
  indicator?: React.ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();

  const styles = {
    group: css({
      paddingLeft: euiTheme.size.xs,
    }),
    item: css({
      flexDirection: 'row',
      alignItems: 'center',
    }),
  };

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      className={styles.group}
    >
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow className={styles.item}>
        <EuiTitle size="xxs">
          <h5>{label}</h5>
        </EuiTitle>
        {indicator}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
