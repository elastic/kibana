import React from 'react';

import {
  KuiIcon,
  KuiFlexGrid,
  KuiFlexItemPanel,
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
        <KuiFlexItemPanel className="guideDemo__icon" key={iconType}>
          <KuiIcon
            type={iconType}
            size="large"
          />
          <KuiText size="small">
            <p>{iconType}</p>
          </KuiText>
        </KuiFlexItemPanel>
      ))
    }
  </KuiFlexGrid>
);
