/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { encodeIpv6 } from '../../lib/helpers';
import { useUiSetting$ } from '../../lib/kibana';

jest.mock('.', () => {
  return {
    Comma: () => ', ',
  };
});

const {
  GoogleLink,
  HostDetailsLink,
  IPDetailsLink,
  ReputationLink,
  WhoIsLink,
  CertificateFingerprintLink,
  Ja3FingerprintLink,
  PortOrServiceNameLink,
  DEFAULT_NUMBER_OF_REPUTATION_LINK,
  ExternalLink,
} = jest.requireActual('.');

jest.mock('../../lib/kibana', () => {
  return {
    useUiSetting$: jest.fn(),
  };
});

describe('Custom Links', () => {
  const hostName = 'Host Name';
  const ipv4 = '192.0.2.255';
  const ipv6 = '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff';
  const ipv6Encoded = encodeIpv6(ipv6);

  describe('HostDetailsLink', () => {
    test('should render valid link to Host Details with hostName as the display text', () => {
      const wrapper = mount(<HostDetailsLink hostName={hostName} />);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `#/link-to/hosts/${encodeURIComponent(hostName)}`
      );
      expect(wrapper.text()).toEqual(hostName);
    });

    test('should render valid link to Host Details with child text as the display text', () => {
      const wrapper = mount(<HostDetailsLink hostName={hostName}>{hostName}</HostDetailsLink>);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `#/link-to/hosts/${encodeURIComponent(hostName)}`
      );
      expect(wrapper.text()).toEqual(hostName);
    });
  });

  describe('IPDetailsLink', () => {
    test('should render valid link to IP Details with ipv4 as the display text', () => {
      const wrapper = mount(<IPDetailsLink ip={ipv4} />);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `#/link-to/network/ip/${encodeURIComponent(ipv4)}/source`
      );
      expect(wrapper.text()).toEqual(ipv4);
    });

    test('should render valid link to IP Details with child text as the display text', () => {
      const wrapper = mount(<IPDetailsLink ip={ipv4}>{hostName}</IPDetailsLink>);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `#/link-to/network/ip/${encodeURIComponent(ipv4)}/source`
      );
      expect(wrapper.text()).toEqual(hostName);
    });

    test('should render valid link to IP Details with ipv6 as the display text', () => {
      const wrapper = mount(<IPDetailsLink ip={ipv6} />);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `#/link-to/network/ip/${encodeURIComponent(ipv6Encoded)}/source`
      );
      expect(wrapper.text()).toEqual(ipv6);
    });
  });

  describe('GoogleLink', () => {
    test('it renders text passed in as value', () => {
      const wrapper = mountWithIntl(
        <GoogleLink link={'http://example.com/'}>{'Example Link'}</GoogleLink>
      );
      expect(wrapper.text()).toEqual('Example Link');
    });

    test('it renders props passed in as link', () => {
      const wrapper = mountWithIntl(
        <GoogleLink link={'http://example.com/'}>{'Example Link'}</GoogleLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        'https://www.google.com/search?q=http%3A%2F%2Fexample.com%2F'
      );
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      const wrapper = mountWithIntl(
        <GoogleLink link={"http://example.com?q=<script>alert('XSS')</script>"}>
          {'Example Link'}
        </GoogleLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        "https://www.google.com/search?q=http%3A%2F%2Fexample.com%3Fq%3D%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('External Link', () => {
    const mockLink = 'https://www.virustotal.com/gui/search/';
    const mockLinkName = 'Link';
    let wrapper: ReactWrapper;
    beforeAll(() => {
      wrapper = mount(
        <ExternalLink url={mockLink} idx={0} allItemsLimit={5} overflowIndexStart={5}>
          {mockLinkName}
        </ExternalLink>
      );
    });

    test('it renders tooltip', () => {
      expect(wrapper.find('[data-test-subj="externalLinkTooltip"]').exists()).toBeTruthy();
    });

    test('it renders ExternalLinkIcon', () => {
      expect(wrapper.find('ExternalLinkIcon').exists()).toBeTruthy();
    });

    test('it renders correct url', () => {
      expect(
        wrapper
          .find('EuiLink')
          .at(0)
          .prop('href')
      ).toEqual(mockLink);
    });

    test('it renders correct comma', () => {
      expect(wrapper.find('Comma')).toBeTruthy();
    });

    test('it renders correct comma for the last item', () => {
      wrapper = mount(
        <ExternalLink url={mockLink} idx={4} allItemsLimit={5} overflowIndexStart={5}>
          {mockLinkName}
        </ExternalLink>
      );
      expect(wrapper.find('Comma').exists()).toBeFalsy();
    });
  });

  describe('ReputationLink', () => {
    const mockCustomizedReputationLinks = [
      { name: 'Link 1', url_template: 'https://www.virustotal.com/gui/search/{{ip}}' },
      {
        name: 'Link 2',
        url_template: 'https://talosintelligence.com/reputation_center/lookup?search={{ip}}',
      },
      { name: 'Link 3', url_template: 'https://www.virustotal.com/gui/search/{{ip}}' },
      {
        name: 'Link 4',
        url_template: 'https://talosintelligence.com/reputation_center/lookup?search={{ip}}',
      },
      { name: 'Link 5', url_template: 'https://www.virustotal.com/gui/search/{{ip}}' },
      {
        name: 'Link 6',
        url_template: 'https://talosintelligence.com/reputation_center/lookup?search={{ip}}',
      },
    ];
    const mockDefaultReputationLinks = mockCustomizedReputationLinks.slice(0, 2);

    describe('links property', () => {
      beforeEach(() => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockDefaultReputationLinks]);
      });

      test('it renders default link text', () => {
        const wrapper = mountWithIntl(<ReputationLink domain={'192.0.2.0'} />);
        expect(
          wrapper
            .find('ExternalLink')
            .at(0)
            .text()
        ).toEqual('Link 1');
        expect(
          wrapper
            .find('ExternalLink')
            .at(1)
            .text()
        ).toEqual('Link 2');
        expect(wrapper.find('Comma')).toHaveLength(1);
      });

      test('it renders customized link text', () => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockCustomizedReputationLinks]);
        const wrapper = mountWithIntl(<ReputationLink domain={'192.0.2.0'} />);
        expect(
          wrapper
            .find('ExternalLink')
            .at(0)
            .text()
        ).toEqual('Link 1');
        expect(
          wrapper
            .find('ExternalLink')
            .at(1)
            .text()
        ).toEqual('Link 2');
        expect(
          wrapper
            .find('ExternalLink')
            .at(2)
            .text()
        ).toEqual('Link 3');
        expect(
          wrapper
            .find('ExternalLink')
            .at(3)
            .text()
        ).toEqual('Link 4');
        expect(
          wrapper
            .find('ExternalLink')
            .at(4)
            .text()
        ).toEqual('Link 5');
        expect(wrapper.find('Comma')).toHaveLength(4);
      });

      test('it renders correct href', () => {
        const wrapper = mountWithIntl(<ReputationLink domain={'192.0.2.0'} />);
        expect(
          wrapper
            .find('ExternalLink')
            .at(0)
            .prop('url')
        ).toEqual('https://www.virustotal.com/gui/search/192.0.2.0');
        expect(
          wrapper
            .find('ExternalLink')
            .at(1)
            .prop('url')
        ).toEqual('https://talosintelligence.com/reputation_center/lookup?search=192.0.2.0');
      });

      test("it encodes <script>alert('XSS')</script>", () => {
        const wrapper = mountWithIntl(<ReputationLink domain={"<script>alert('XSS')</script>"} />);

        expect(
          wrapper
            .find('ExternalLink')
            .at(0)
            .prop('url')
        ).toEqual("https://www.virustotal.com/gui/search/%3Cscript%3Ealert('XSS')%3C%2Fscript%3E");
        expect(
          wrapper
            .find('ExternalLink')
            .at(1)
            .prop('url')
        ).toEqual(
          "https://talosintelligence.com/reputation_center/lookup?search=%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
        );
      });
    });

    describe('number of links', () => {
      beforeAll(() => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockCustomizedReputationLinks]);
      });

      afterEach(() => {
        (useUiSetting$ as jest.Mock).mockClear();
      });

      test('it renders correct number of links by default', () => {
        const wrapper = mountWithIntl(<ReputationLink domain={'192.0.2.0'} />);
        expect(wrapper.find('ExternalLink')).toHaveLength(DEFAULT_NUMBER_OF_REPUTATION_LINK);
      });

      test('it renders correct number of tooltips by default', () => {
        const wrapper = mountWithIntl(<ReputationLink domain={'192.0.2.0'} />);
        expect(wrapper.find('EuiToolTip')).toHaveLength(DEFAULT_NUMBER_OF_REPUTATION_LINK);
      });

      test('it renders correct number of links if overflow index is provided', () => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockCustomizedReputationLinks]);

        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('ExternalLink')).toHaveLength(1);
      });

      test('it renders correct number of tooltips if overflow index is provided', () => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockCustomizedReputationLinks]);

        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('EuiToolTip')).toHaveLength(1);
      });
    });

    describe('invalid customized links', () => {
      const mockInvalidLinksEmptyObj = [{}];
      const mockInvalidLinksNoName = [
        { url_template: 'https://talosintelligence.com/reputation_center/lookup?search={{ip}}' },
      ];
      const mockInvalidLinksNoUrl = [{ name: 'Link 1' }];
      const mockInvalidUrl = [{ name: 'Link 1', url_template: "<script>alert('XSS')</script>" }];
      afterEach(() => {
        (useUiSetting$ as jest.Mock).mockClear();
      });

      test('it filters empty object', () => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockInvalidLinksEmptyObj]);

        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('EuiLink')).toHaveLength(0);
      });

      test('it filters object without name property', () => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockInvalidLinksNoName]);

        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('EuiLink')).toHaveLength(0);
      });

      test('it filters object without url_template property', () => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockInvalidLinksNoUrl]);

        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('EuiLink')).toHaveLength(0);
      });

      test('it filters object with invalid url', () => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockInvalidUrl]);

        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('EuiLink')).toHaveLength(0);
      });
    });

    describe('external icon', () => {
      beforeAll(() => {
        (useUiSetting$ as jest.Mock).mockReset();
        (useUiSetting$ as jest.Mock).mockReturnValue([mockCustomizedReputationLinks]);
      });

      afterEach(() => {
        (useUiSetting$ as jest.Mock).mockClear();
      });

      test('it renders correct number of external icons by default', () => {
        const wrapper = mountWithIntl(<ReputationLink domain={'192.0.2.0'} />);
        expect(wrapper.find('ExternalLinkIcon')).toHaveLength(5);
      });

      test('it renders correct number of external icons', () => {
        const wrapper = mountWithIntl(
          <ReputationLink domain={'192.0.2.0'} overflowIndexStart={1} />
        );
        expect(wrapper.find('ExternalLinkIcon')).toHaveLength(1);
      });
    });
  });

  describe('WhoisLink', () => {
    test('it renders ip passed in as domain', () => {
      const wrapper = mountWithIntl(<WhoIsLink domain={'192.0.2.0'}>{'Example Link'}</WhoIsLink>);
      expect(wrapper.text()).toEqual('Example Link');
    });

    test('it renders correct href', () => {
      const wrapper = mountWithIntl(<WhoIsLink domain={'192.0.2.0'}>{'Example Link'} </WhoIsLink>);
      expect(wrapper.find('a').prop('href')).toEqual('https://www.iana.org/whois?q=192.0.2.0');
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      const wrapper = mountWithIntl(
        <WhoIsLink domain={"<script>alert('XSS')</script>"}>{'Example Link'}</WhoIsLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        "https://www.iana.org/whois?q=%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('CertificateFingerprintLink', () => {
    test('it renders link text', () => {
      const wrapper = mountWithIntl(
        <CertificateFingerprintLink certificateFingerprint={'abcd'}>
          {'Example Link'}
        </CertificateFingerprintLink>
      );
      expect(wrapper.text()).toEqual('Example Link');
    });

    test('it renders correct href', () => {
      const wrapper = mountWithIntl(
        <CertificateFingerprintLink certificateFingerprint={'abcd'}>
          {'Example Link'}
        </CertificateFingerprintLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        'https://sslbl.abuse.ch/ssl-certificates/sha1/abcd'
      );
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      const wrapper = mountWithIntl(
        <CertificateFingerprintLink certificateFingerprint={"<script>alert('XSS')</script>"}>
          {'Example Link'}
        </CertificateFingerprintLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        "https://sslbl.abuse.ch/ssl-certificates/sha1/%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('Ja3FingerprintLink', () => {
    test('it renders link text', () => {
      const wrapper = mountWithIntl(
        <Ja3FingerprintLink ja3Fingerprint={'abcd'}>{'Example Link'}</Ja3FingerprintLink>
      );
      expect(wrapper.text()).toEqual('Example Link');
    });

    test('it renders correct href', () => {
      const wrapper = mountWithIntl(
        <Ja3FingerprintLink ja3Fingerprint={'abcd'}>{'Example Link'}</Ja3FingerprintLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        'https://sslbl.abuse.ch/ja3-fingerprints/abcd'
      );
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      const wrapper = mountWithIntl(
        <Ja3FingerprintLink ja3Fingerprint={"<script>alert('XSS')</script>"}>
          {'Example Link'}
        </Ja3FingerprintLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        "https://sslbl.abuse.ch/ja3-fingerprints/%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });

  describe('PortOrServiceNameLink', () => {
    test('it renders link text', () => {
      const wrapper = mountWithIntl(
        <PortOrServiceNameLink portOrServiceName={443}>{'Example Link'}</PortOrServiceNameLink>
      );
      expect(wrapper.text()).toEqual('Example Link');
    });

    test('it renders correct href when port is a number', () => {
      const wrapper = mountWithIntl(
        <PortOrServiceNameLink portOrServiceName={443}>{'Example Link'}</PortOrServiceNameLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=443'
      );
    });

    test('it renders correct href when port is a string', () => {
      const wrapper = mountWithIntl(
        <PortOrServiceNameLink portOrServiceName={'80'}>{'Example Link'}</PortOrServiceNameLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=80'
      );
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      const wrapper = mountWithIntl(
        <PortOrServiceNameLink portOrServiceName={"<script>alert('XSS')</script>"}>
          {'Example Link'}
        </PortOrServiceNameLink>
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        "https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=%3Cscript%3Ealert('XSS')%3C%2Fscript%3E"
      );
    });
  });
});
