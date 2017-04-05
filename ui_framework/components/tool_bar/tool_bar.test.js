import {
  basicRenderTest,
  basicHtmlAttributesRenderTest,
  basicRendersChildrenTest
} from '../../test/common_tests';

import {
  KuiToolBar,
  KuiToolBarFooter,
} from './tool_bar';

describe('KuiToolBar', () => {
  test('is rendered', () => basicRenderTest(KuiToolBar));
  test('HTML attributes are rendered', () => basicHtmlAttributesRenderTest(KuiToolBar));
  test('renders children', () => basicRendersChildrenTest(KuiToolBar));
});

describe('KuiToolBarFooter', () => {
  test('is rendered', () => basicRenderTest(KuiToolBarFooter));
  test('HTML attributes are rendered', () => basicHtmlAttributesRenderTest(KuiToolBarFooter));
  test('renders children', () => basicRendersChildrenTest(KuiToolBarFooter));
});
