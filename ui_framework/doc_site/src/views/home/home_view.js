import React from 'react';

import {
  KuiText,
  KuiCode,
  KuiFlexGroup,
  KuiFlexItem,
} from '../../../../components';

const colors = [
  {
    color: 'kuiColorPrimary',
    hex: '#0079a5',
  },
  {
    color: 'kuiColorSecondary',
    hex: '#00A69B',
  },
  {
    color: 'kuiColorAccent',
    hex: '#DD0A73',
  },
  {
    color: 'kuiColorDanger',
    hex: '#A30000',
  },
  {
    color: 'kuiColorWarning',
    hex: '#E5830E',
  },
  // $kuiColorEmptyShade: #FFF
  // $kuiColorLightestShade: #F5F5F5
  // $kuiColorLightShade: #D9D9D9
  // $kuiColorMediumShade: #999
  // $kuiColorDarkShade: #666
  // $kuiColorDarkestShade: #3F3F3F
  // $kuiColorFullShade: #000
];

const grays = [
  {
    color: 'Empty Shade',
    hex: '#FFF',
  },
  {
    color: 'Lightest Shade',
    hex: '#F5F5F5',
  },
  {
    color: 'Light Shade',
    hex: '#D9D9D9',
  },
  {
    color: 'Medium Shade',
    hex: '#999999',
  },
  {
    color: 'Dark Shade',
    hex: '#666666',
  },
  {
    color: 'Darkest Shade',
    hex: '#3F3F3F',
  },
  {
    color: 'Full Shade',
    hex: '#000000',
  },
];

export const HomeView = () => (
  <div>
    <KuiText>
      <h1>Kibana UI Framework</h1>
      <p>
        The Kibana team uses the UI Framework to build Kibana&rsquo;s user interface. Please see
        the <a href="https://www.elastic.co/guide/en/kibana/current/index.html">general Kibana docs</a> for information on how to use Kibana, and
        the <a href="https://www.elastic.co/guide/en/kibana/current/kibana-plugins.html">plugin-specific section</a> for
        help developing Kibana plugins. You can find the source for the UI Framework at
        the <a href="https://github.com/elastic/kibana/tree/master/ui_framework">Kibana repo</a>.
      </p>

      <h2>Goals</h2>
      <p>KUI has the following primary goals..</p>
      <ol>
        <li><KuiCode>KUI is accessible to everyone</KuiCode>. Use high contrast,
          color-blind safe palettes and proper aria labels.
        </li>
        <li><KuiCode>KUI is themable</KuiCode>. Theming should involve changing
          less than a dozen lines of code. This means strict variable usage.
        </li>
        <li><KuiCode>KUI is responsive</KuiCode>. Currently we target
          mobile, laptop, desktop and wide desktop breakpoints.
        </li>
        <li><KuiCode>KUI is playful</KuiCode>. Consistent use of animation can
          bring life to our design.
        </li>
        <li><KuiCode>KUI is documented and has tests</KuiCode>. Make sure
          the code is friendly to the novice and expert alike.
        </li>
      </ol>
      <h2>Colors</h2>
      <p>The UI Framework uses a very limited palette. Every color is calculated using math from one of the below.</p>
    </KuiText>
    <KuiFlexGroup gutterSize="small">
      {colors.map((item, index) => {
        return (
          <KuiFlexItem className="guideDemo__color" style={{ background: item.hex }} key={index}>
            <p>{item.color}</p>
            <p className="guideDemo__colorHex">{item.hex}</p>
          </KuiFlexItem>
        );
      })}
    </KuiFlexGroup>
    <KuiFlexGroup gutterSize="small">
      {grays.map((item, index) => {
        return (
          <KuiFlexItem className="guideDemo__color" style={{ background: item.hex }} key={index}>
            <p>{item.color}</p>
            <p className="guideDemo__colorHex">{item.hex}</p>
          </KuiFlexItem>
        );
      })}
    </KuiFlexGroup>
  </div>
);
