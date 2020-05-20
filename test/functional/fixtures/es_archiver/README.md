## Changing test data sets

If you need to update these datasets use:

 * Run the dev server `node scripts/functional_tests_server.js`
 * When it starts, use es_archiver to load the dataset you want to change
 * Make the changes you want
 * Export the data using es_archiver node scripts/es_archiver.js save data .kibana
 * Override the mapping and data files in the project and commit your changes
 