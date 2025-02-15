/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @storybook/addon-storyshots is not supported in Jest 27+ https://github.com/storybookjs/storybook/issues/15916
// @storybook/addon-storyshots has been removed in Storybook 8 https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#storyshots-has-been-removed
describe.skip('Fleet Storybook Smoke', () => {
  test('Init', async () => {
    // await initStoryshots({
    //   configPath: __dirname,
    //   framework: 'react',
    //   test: async ({ story }) => {
    //     const renderer = mount(createElement(story.render));
    //     // wait until the element will perform all renders and resolve all promises (lazy loading, especially)
    //     await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    //     expect(renderer.html()).not.toContain('euiErrorBoundary');
    //   },
    // });
  });
});
