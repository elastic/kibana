import React from 'react';

import {
  KuiIcon,
  KuiFlexGrid,
  KuiFlexItem,
  KuiText,
} from '../../../../components';

const iconTypes = [
  'kibanaLogo',
  'logoSlack',
  'logoGmail',
  'logoWebhook',
];

export default () => (
  <KuiFlexGrid columns={4}>
    {
      iconTypes.map(iconType => (
        <KuiFlexItem className="guideDemo__icon" key={iconType}>
          <KuiIcon
            type={iconType}
            size="large"
          />
          <KuiText>
            <p>{iconType}</p>
          </KuiText>
        </KuiFlexItem>
      ))
    }
  </KuiFlexGrid>
);
