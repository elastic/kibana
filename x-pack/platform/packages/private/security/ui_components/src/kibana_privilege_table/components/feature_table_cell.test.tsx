/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiIconTip, EuiLink, EuiPopover } from '@elastic/eui';
import React from 'react';

import { SecuredFeature } from '@kbn/security-role-management-model';
import { createFeature } from '@kbn/security-role-management-model/src/__fixtures__';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { FeatureTableCell } from './feature_table_cell';

describe('FeatureTableCell', () => {
  it('renders the feature name', () => {
    const feature = createFeature({
      id: 'test-feature',
      name: 'Test Feature',
    });

    const wrapper = mountWithIntl(
      <FeatureTableCell feature={new SecuredFeature(feature.toRaw())} />
    );

    expect(wrapper.text()).toMatchInlineSnapshot(`"Test Feature"`);
    expect(wrapper.find(EuiIconTip)).toHaveLength(0);
  });

  it('renders a feature name with tooltip when configured', () => {
    const feature = createFeature({
      id: 'test-feature',
      name: 'Test Feature',
      privilegesTooltip: 'This is my awesome tooltip content',
    });

    const wrapper = mountWithIntl(
      <FeatureTableCell feature={new SecuredFeature(feature.toRaw())} />
    );

    expect(wrapper.text()).toMatchInlineSnapshot(`"Test FeatureInfo"`);

    expect(wrapper.find(EuiIconTip).props().content).toMatchInlineSnapshot(`
      <EuiText>
        <p>
          This is my awesome tooltip content
        </p>
      </EuiText>
    `);
  });

  it('renders an info button that opens a popover with a docs link when the tooltip includes a URL', () => {
    const documentationUrl = 'https://www.elastic.co/docs/example';
    const feature = createFeature({
      id: 'test-feature',
      name: 'Test Feature',
      privilegesTooltip: `This functionality is in technical preview. ${documentationUrl}`,
    });

    const wrapper = mountWithIntl(
      <FeatureTableCell feature={new SecuredFeature(feature.toRaw())} />
    );

    expect(wrapper.find(EuiIconTip)).toHaveLength(0);

    const button = wrapper.find(EuiButtonIcon);
    expect(button.props()['aria-label']).toBe('Test Feature information');
    expect(button.props()['data-test-subj']).toBe('featurePrivilegeInformationButton');

    button.simulate('click');
    wrapper.update();

    const popover = wrapper.find(EuiPopover);
    expect(popover.props().isOpen).toBe(true);

    const panel = mountWithIntl(popover.props().children as React.ReactElement);
    expect(panel.text()).toContain('This functionality is in technical preview.');

    const docsLink = panel.find(EuiLink);
    expect(docsLink).toHaveLength(1);
    expect(docsLink.props().href).toBe(documentationUrl);
    expect(docsLink.props().target).toBe('_blank');
    expect(docsLink.text()).toContain('Documentation');
  });
});
