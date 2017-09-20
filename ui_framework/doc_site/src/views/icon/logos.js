import React from 'react';

import {
  KuiFlexGrid,
  KuiFlexItem,
  KuiIcon,
  KuiPanel,
  KuiText,
} from '../../../../components';

const iconTypes = [
  'logoKibana',
  'logoSlack',
  'logoGmail',
  'logoWebhook',
  'logoElasticStack',
  'logoBeats',
  'logoLogstash',
  'logoXpack',
];

export default () => (
  <KuiFlexGrid columns={4}>
    {
      iconTypes.map(iconType => (
        <KuiFlexItem className="guideDemo__icon" key={iconType}>
          <KuiPanel>
            <KuiIcon
              type={iconType}
              size="large"
            />
            <KuiText size="small">
              <p>{iconType}</p>
            </KuiText>
          </KuiPanel>
        </KuiFlexItem>
      ))
    }
  </KuiFlexGrid>
);
