import expect from 'expect.js';

import { UiNavLink } from '../ui_nav_link';

describe('UiNavLink', () => {
  describe('constructor', () => {
    it('initializes the object properties as expected', () => {
      const urlBasePath = 'http://localhost:5601/rnd';
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
        hidden: true,
        disabled: true
      };

      const link = new UiNavLink(urlBasePath, spec);
      expect(link.toJSON()).to.eql({
        id: spec.id,
        title: spec.title,
        order: spec.order,
        url: `${urlBasePath}${spec.url}`,
        subUrlBase: `${urlBasePath}${spec.url}`,
        description: spec.description,
        icon: spec.icon,
        hidden: spec.hidden,
        disabled: spec.disabled,

        // defaults
        linkToLastSubUrl: true,
        tooltip: ''
      });
    });

    it('initializes the url property without a base path when one is not specified in the spec', () => {
      const urlBasePath = undefined;
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(urlBasePath, spec);
      expect(link.toJSON()).to.have.property('url', spec.url);
    });

    it('initializes the order property to 0 when order is not specified in the spec', () => {
      const urlBasePath = undefined;
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(urlBasePath, spec);

      expect(link.toJSON()).to.have.property('order', 0);
    });

    it('initializes the linkToLastSubUrl property to false when false is specified in the spec', () => {
      const urlBasePath = undefined;
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
        linkToLastSubUrl: false
      };
      const link = new UiNavLink(urlBasePath, spec);

      expect(link.toJSON()).to.have.property('linkToLastSubUrl', false);
    });

    it('initializes the linkToLastSubUrl property to true by default', () => {
      const urlBasePath = undefined;
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(urlBasePath, spec);

      expect(link.toJSON()).to.have.property('linkToLastSubUrl', true);
    });

    it('initializes the hidden property to false by default', () => {
      const urlBasePath = undefined;
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(urlBasePath, spec);

      expect(link.toJSON()).to.have.property('hidden', false);
    });

    it('initializes the disabled property to false by default', () => {
      const urlBasePath = undefined;
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(urlBasePath, spec);

      expect(link.toJSON()).to.have.property('disabled', false);
    });

    it('initializes the tooltip property to an empty string by default', () => {
      const urlBasePath = undefined;
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(urlBasePath, spec);

      expect(link.toJSON()).to.have.property('tooltip', '');
    });
  });
});
