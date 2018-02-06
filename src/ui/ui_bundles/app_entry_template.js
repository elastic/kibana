export const appEntryTemplate = (bundle) => `
/**
 * Test entry file
 *
 * This is programatically created and updated, do not modify
 *
 * context: ${bundle.getContext()}
 */

require('ui/chrome');
${bundle.getRequires().join('\n')}
require('ui/chrome').bootstrap(/* xoxo */);

`;
