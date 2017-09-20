import React from 'react';

import {
  KuiText,
  KuiCode,
  KuiFlexGroup,
  KuiFlexGrid,
  KuiFlexItem,
  KuiSpacer,
  KuiHorizontalRule,
} from '../../../../components';

const pkg = require('../../../../../package.json');

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
    color: 'kuiColorEmptyShade',
    hex: '#FFF',
    textColor: '#222'
  },
  {
    color: 'kuiColorLightestShade',
    hex: '#F5F5F5',
    textColor: '#222'
  },
  {
    color: 'kuiColorLightShade',
    hex: '#D9D9D9',
    textColor: '#222'
  },
  {
    color: 'kuiColorMediumShade',
    hex: '#999999',
    textColor: '#FFF'
  },
  {
    color: 'kuiColorDarkShade',
    hex: '#666666',
    textColor: '#FFF'
  },
  {
    color: 'kuiColorDarkestShade',
    hex: '#3F3F3F',
    textColor: '#FFF'
  },
  {
    color: 'kuiColorFullShade',
    hex: '#000000',
    textColor: '#FFF'
  },
];

const sizes = [
  {
    name: 'Extra small',
    size: 4,
  },
  {
    name: 'Small',
    size: 8,
  },
  {
    name: 'Medium',
    size: 12,
  },
  {
    name: 'default',
    size: 16,
  },
  {
    name: 'Large',
    size: 24,
  },
  {
    name: 'Extra large',
    size: 32,
  },
  {
    name: 'Extra extra large',
    size: 40,
  },
];

const fontSizes = [
  {
    name: 'Extra small',
    size: 12,
  },
  {
    name: 'Small',
    size: 14,
  },
  {
    name: 'Default',
    size: 16,
  },
  {
    name: 'Large',
    size: 24,
  },
  {
    name: 'Extra extra large',
    size: 32,
  },
];

export const HomeView = () => (
  <div className="guideSection__text">
    <KuiText>
      <h1>Kibana UI Framework</h1>
      <p>Version: <strong>{pkg.version}</strong></p>
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
    </KuiText>

    <KuiHorizontalRule />

    <KuiFlexGroup>
      <KuiFlexItem>
        <KuiText>
          <h2>Colors</h2>
          <p>
            The UI Framework uses a very limited palette. Every color is
            calculated using Sass color from one of the below.
          </p>
          <h3>Theming</h3>
          <p>
            Theming is achieved by overwriting these twelve colors with
            a different set. This is why it is very important <KuiCode>never to use hex colors</KuiCode> in
            KUI outside of the global variable files.
          </p>
          <h3>Accessibility</h3>
          <p>
            We aim to be at least AA compliant in our design. That means that only some of the colors
            to the right should be used for text.
          </p>
        </KuiText>
      </KuiFlexItem>
      <KuiFlexItem>
        <KuiFlexGrid columns={2} gutterSize="small">
          {colors.map((item, index) => {
            return (
              <KuiFlexItem className="guideDemo__color" style={{ background: item.hex }} key={index}>
                <p>${item.color}</p>
                <p className="guideDemo__colorHex">{item.hex}</p>
              </KuiFlexItem>
            );
          })}

          {grays.map((item, index) => {
            return (
              <KuiFlexItem className="guideDemo__color" style={{ background: item.hex, color: item.textColor }} key={index}>
                <p>${item.color}</p>
                <p className="guideDemo__colorHex">{item.hex}</p>
              </KuiFlexItem>
            );
          })}
        </KuiFlexGrid>
      </KuiFlexItem>
    </KuiFlexGroup>

    <KuiHorizontalRule />

    <KuiText>
      <h2>Spacing and sizing</h2>
      <p>
        <KuiCode>KUI</KuiCode> is a minimalist design and as such needs to be very precise
        with the spacing and padding between and around items. <KuiCode>16px</KuiCode> is our
        magic number. It is our default font-size and our default spacing size.
        Larger numbers can be used, but must always be
        a <KuiCode>multiple of 16px</KuiCode> beyond these sizes below.
      </p>

      <p>Sizing when passed as values to props should always be <KuiCode>xs / s / m / l / xl ...etc</KuiCode></p>

    </KuiText>

    <KuiSpacer size="l" />

    <KuiFlexGroup gutterSize="small" className="guideDemo__sizeGrid">
      <KuiFlexItem>
        <KuiText><h3>Element sizes / paddings / margins</h3></KuiText>
        {sizes.map((item, index) => {
          return (
            <div key={index}>
              <KuiSpacer size="m" />
              <KuiFlexGroup key={index} alignItems="center">
                <KuiFlexItem grow={false} style={{ width: 40, textAlign: 'right' }}>
                  <div className="guideDemo__size" style={{ height: item.size, width: item.size }} />
                </KuiFlexItem>
                <KuiFlexItem>
                  <p className="guideDemo__sizeText">
                    {item.size}px - {item.name}
                  </p>
                </KuiFlexItem>
              </KuiFlexGroup>
            </div>
          );
        })}
      </KuiFlexItem>
      <KuiFlexItem>
        <KuiText><h3>Font sizes</h3></KuiText>
        {fontSizes.map((item, index) => {
          return (
            <div style={{ fontSize: item.size, marginTop: 24 }} key={index}>
              {item.name} is {item.size}: Something about a lazy fox?
            </div>
          );
        })}
      </KuiFlexItem>
    </KuiFlexGroup>



  </div>
);
