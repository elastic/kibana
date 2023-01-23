/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'header',
    'unifiedSearch',
  ]);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');
  const monacoEditor = getService('monacoEditor');
  const filterBar = getService('filterBar');
  const fieldEditor = getService('fieldEditor');

  describe('discover sidebar', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
    });

    beforeEach(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilSearchingHasFinished();
    });

    afterEach(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
      await PageObjects.discover.cleanSidebarLocalStorage();
    });

    describe('field filtering', function () {
      it('should reveal and hide the filter form when the toggle is clicked', async function () {
        await PageObjects.discover.openSidebarFieldFilter();
        await PageObjects.discover.closeSidebarFieldFilter();
      });
    });

    describe('field stats', function () {
      it('should work for regular and pinned filters', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();

        const allTermsResult = 'jpg\n65.0%\ncss\n15.4%\npng\n9.8%\ngif\n6.6%\nphp\n3.2%';
        await PageObjects.discover.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(allTermsResult);

        await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'jpg' });
        await PageObjects.header.waitUntilLoadingHasFinished();

        const onlyJpgResult = 'jpg\n100%';
        await PageObjects.discover.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(onlyJpgResult);

        await filterBar.toggleFilterNegated('extension');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const jpgExcludedResult = 'css\n44.1%\npng\n28.0%\ngif\n18.8%\nphp\n9.1%';
        await PageObjects.discover.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(
          jpgExcludedResult
        );

        await filterBar.toggleFilterPinned('extension');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.discover.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(
          jpgExcludedResult
        );

        await browser.refresh();

        await PageObjects.discover.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(
          jpgExcludedResult
        );

        await filterBar.toggleFilterEnabled('extension');
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.discover.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(allTermsResult);
      });
    });

    describe('collapse expand', function () {
      it('should initially be expanded', async function () {
        await testSubjects.existOrFail('discover-sidebar');
      });

      it('should collapse when clicked', async function () {
        await PageObjects.discover.toggleSidebarCollapse();
        await testSubjects.missingOrFail('discover-sidebar');
      });

      it('should expand when clicked', async function () {
        await PageObjects.discover.toggleSidebarCollapse();
        await testSubjects.existOrFail('discover-sidebar');
      });
    });

    describe('renders field groups', function () {
      it('should show field list groups excluding subfields', async function () {
        await PageObjects.discover.waitUntilSidebarHasLoaded();
        expect(await PageObjects.discover.doesSidebarShowFields()).to.be(true);

        // Initial Available fields
        const expectedInitialAvailableFields =
          '@message, @tags, @timestamp, agent, bytes, clientip, extension, geo.coordinates, geo.dest, geo.src, geo.srcdest, headings, host, id, index, ip, links, machine.os, machine.ram, machine.ram_range, memory, meta.char, meta.related, meta.user.firstname, meta.user.lastname, nestedField.child, phpmemory, referer, relatedContent.article:modified_time, relatedContent.article:published_time, relatedContent.article:section, relatedContent.article:tag, relatedContent.og:description, relatedContent.og:image, relatedContent.og:image:height, relatedContent.og:image:width, relatedContent.og:site_name, relatedContent.og:title, relatedContent.og:type, relatedContent.og:url, relatedContent.twitter:card, relatedContent.twitter:description, relatedContent.twitter:image, relatedContent.twitter:site, relatedContent.twitter:title, relatedContent.url, request, response, spaces, type';
        let availableFields = await PageObjects.discover.getSidebarSectionFieldNames('available');
        expect(availableFields.length).to.be(50);
        expect(availableFields.join(', ')).to.be(expectedInitialAvailableFields);

        // Available fields after scrolling down
        const emptySectionButton = await find.byCssSelector(
          PageObjects.discover.getSidebarSectionSelector('empty', true)
        );
        await emptySectionButton.scrollIntoViewIfNecessary();
        availableFields = await PageObjects.discover.getSidebarSectionFieldNames('available');
        expect(availableFields.length).to.be(53);
        expect(availableFields.join(', ')).to.be(
          `${expectedInitialAvailableFields}, url, utc_time, xss`
        );

        // Expand Empty section
        await PageObjects.discover.toggleSidebarSection('empty');
        expect((await PageObjects.discover.getSidebarSectionFieldNames('empty')).join(', ')).to.be(
          ''
        );

        // Expand Meta section
        await PageObjects.discover.toggleSidebarSection('meta');
        expect((await PageObjects.discover.getSidebarSectionFieldNames('meta')).join(', ')).to.be(
          '_id, _index, _score'
        );

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );
      });

      it('should show field list groups excluding subfields when searched from source', async function () {
        await kibanaServer.uiSettings.update({ 'discover:searchFieldsFromSource': true });
        await browser.refresh();

        await PageObjects.discover.waitUntilSidebarHasLoaded();
        expect(await PageObjects.discover.doesSidebarShowFields()).to.be(true);

        // Initial Available fields
        let availableFields = await PageObjects.discover.getSidebarSectionFieldNames('available');
        expect(availableFields.length).to.be(50);
        expect(
          availableFields
            .join(', ')
            .startsWith(
              '@message, @tags, @timestamp, agent, bytes, clientip, extension, geo.coordinates'
            )
        ).to.be(true);

        // Available fields after scrolling down
        const emptySectionButton = await find.byCssSelector(
          PageObjects.discover.getSidebarSectionSelector('empty', true)
        );
        await emptySectionButton.scrollIntoViewIfNecessary();
        availableFields = await PageObjects.discover.getSidebarSectionFieldNames('available');
        expect(availableFields.length).to.be(53);

        // Expand Empty section
        await PageObjects.discover.toggleSidebarSection('empty');
        expect((await PageObjects.discover.getSidebarSectionFieldNames('empty')).join(', ')).to.be(
          ''
        );

        // Expand Meta section
        await PageObjects.discover.toggleSidebarSection('meta');
        expect((await PageObjects.discover.getSidebarSectionFieldNames('meta')).join(', ')).to.be(
          '_id, _index, _score'
        );

        // Expand Unmapped section
        await PageObjects.discover.toggleSidebarSection('unmapped');
        expect(
          (await PageObjects.discover.getSidebarSectionFieldNames('unmapped')).join(', ')
        ).to.be('relatedContent');

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 1 unmapped field. 0 empty fields. 3 meta fields.'
        );
      });

      it('should show selected and popular fields', async function () {
        await PageObjects.discover.clickFieldListItemAdd('extension');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.clickFieldListItemAdd('@message');
        await PageObjects.discover.waitUntilSearchingHasFinished();

        expect(
          (await PageObjects.discover.getSidebarSectionFieldNames('selected')).join(', ')
        ).to.be('extension, @message');

        const availableFields = await PageObjects.discover.getSidebarSectionFieldNames('available');
        expect(availableFields.includes('extension')).to.be(true);
        expect(availableFields.includes('@message')).to.be(true);

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '2 selected fields. 2 popular fields. 53 available fields. 0 empty fields. 3 meta fields.'
        );

        await PageObjects.discover.clickFieldListItemRemove('@message');
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await PageObjects.discover.clickFieldListItemAdd('_id');
        await PageObjects.discover.waitUntilSearchingHasFinished();
        await PageObjects.discover.clickFieldListItemAdd('@message');
        await PageObjects.discover.waitUntilSearchingHasFinished();

        expect(
          (await PageObjects.discover.getSidebarSectionFieldNames('selected')).join(', ')
        ).to.be('extension, _id, @message');

        expect(
          (await PageObjects.discover.getSidebarSectionFieldNames('popular')).join(', ')
        ).to.be('@message, _id, extension');

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '3 selected fields. 3 popular fields. 53 available fields. 0 empty fields. 3 meta fields.'
        );
      });

      it('should show selected and available fields in text-based mode', async function () {
        await kibanaServer.uiSettings.update({ 'discover:enableSql': true });
        await browser.refresh();

        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );

        await PageObjects.discover.selectTextBaseLang('SQL');

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '50 selected fields. 51 available fields.'
        );

        await PageObjects.discover.clickFieldListItemRemove('extension');
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '49 selected fields. 51 available fields.'
        );

        const testQuery = `SELECT "@tags", geo.dest, count(*) occurred FROM "logstash-*"
          GROUP BY "@tags", geo.dest
          HAVING occurred > 20
          ORDER BY occurred DESC`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '3 selected fields. 3 available fields.'
        );
        expect(
          (await PageObjects.discover.getSidebarSectionFieldNames('selected')).join(', ')
        ).to.be('@tags, geo.dest, occurred');

        await PageObjects.unifiedSearch.switchDataView(
          'discover-dataView-switch-link',
          'logstash-*',
          true
        );

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '1 popular field. 53 available fields. 0 empty fields. 3 meta fields.'
        );
      });

      it('should work correctly for a data view for a missing index', async function () {
        // but we are skipping importing the index itself
        await kibanaServer.importExport.load(
          'test/functional/fixtures/kbn_archiver/index_pattern_without_timefield'
        );
        await browser.refresh();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );

        await PageObjects.discover.selectIndexPattern('with-timefield');

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '0 available fields. 0 meta fields.'
        );
        await testSubjects.existOrFail(
          `${PageObjects.discover.getSidebarSectionSelector('available')}-fetchWarning`
        );
        await testSubjects.existOrFail(
          `${PageObjects.discover.getSidebarSectionSelector(
            'available'
          )}NoFieldsCallout-noFieldsExist`
        );

        await PageObjects.discover.selectIndexPattern('logstash-*');

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );
        await kibanaServer.importExport.unload(
          'test/functional/fixtures/kbn_archiver/index_pattern_without_timefield'
        );
      });

      it('should work correctly when switching data views', async function () {
        await esArchiver.loadIfNeeded(
          'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
        );
        await kibanaServer.importExport.load(
          'test/functional/fixtures/kbn_archiver/index_pattern_without_timefield'
        );

        await browser.refresh();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );

        await PageObjects.discover.selectIndexPattern('without-timefield');

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '6 available fields. 0 empty fields. 3 meta fields.'
        );

        await PageObjects.discover.selectIndexPattern('with-timefield');

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '0 available fields. 7 empty fields. 3 meta fields.'
        );
        await testSubjects.existOrFail(
          `${PageObjects.discover.getSidebarSectionSelector(
            'available'
          )}NoFieldsCallout-noFieldsMatch`
        );

        await PageObjects.discover.selectIndexPattern('logstash-*');

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );

        await kibanaServer.importExport.unload(
          'test/functional/fixtures/kbn_archiver/index_pattern_without_timefield'
        );

        await esArchiver.unload(
          'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
        );
      });

      it('should work when filters change', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );

        await PageObjects.discover.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be(
          'jpg\n65.0%\ncss\n15.4%\npng\n9.8%\ngif\n6.6%\nphp\n3.2%'
        );

        await filterBar.addFilter({ field: 'extension', operation: 'is', value: 'jpg' });
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );

        // check that the filter was passed down to the sidebar
        await PageObjects.discover.clickFieldListItem('extension');
        expect(await testSubjects.getVisibleText('dscFieldStats-topValues')).to.be('jpg\n100%');
      });

      it('should work for many fields', async () => {
        await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/many_fields');
        await kibanaServer.importExport.load(
          'test/functional/fixtures/kbn_archiver/many_fields_data_view'
        );

        await browser.refresh();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );

        await PageObjects.discover.selectIndexPattern('indices-stats*');

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '6873 available fields. 0 empty fields. 3 meta fields.'
        );

        await PageObjects.discover.selectIndexPattern('logstash-*');

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );

        await kibanaServer.importExport.unload(
          'test/functional/fixtures/kbn_archiver/many_fields_data_view'
        );
        await esArchiver.unload('test/functional/fixtures/es_archiver/many_fields');
      });

      it('should work with ad-hoc data views and runtime fields', async () => {
        await PageObjects.discover.createAdHocDataView('logstash', true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );

        await PageObjects.discover.addRuntimeField(
          '_bytes-runtimefield',
          `emit((doc["bytes"].value * 2).toString())`
        );
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '54 available fields. 0 empty fields. 3 meta fields.'
        );

        let allFields = await PageObjects.discover.getAllFieldNames();
        expect(allFields.includes('_bytes-runtimefield')).to.be(true);

        await PageObjects.discover.editField('_bytes-runtimefield');
        await fieldEditor.enableCustomLabel();
        await fieldEditor.setCustomLabel('_bytes-runtimefield2');
        await fieldEditor.save();

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '54 available fields. 0 empty fields. 3 meta fields.'
        );

        allFields = await PageObjects.discover.getAllFieldNames();
        expect(allFields.includes('_bytes-runtimefield2')).to.be(true);
        expect(allFields.includes('_bytes-runtimefield')).to.be(false);

        await PageObjects.discover.removeField('_bytes-runtimefield');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );

        allFields = await PageObjects.discover.getAllFieldNames();
        expect(allFields.includes('_bytes-runtimefield2')).to.be(false);
        expect(allFields.includes('_bytes-runtimefield')).to.be(false);
      });

      it('should render even when retrieving documents failed with an error', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();

        await testSubjects.missingOrFail('discoverNoResultsError');

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );

        await PageObjects.discover.addRuntimeField('_invalid-runtimefield', `emit(‘’);`);

        await PageObjects.header.waitUntilLoadingHasFinished();

        // error in fetching documents because of the invalid runtime field
        await testSubjects.existOrFail('discoverNoResultsError');

        await PageObjects.discover.waitUntilSidebarHasLoaded();

        // check that the sidebar is rendered
        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '54 available fields. 0 empty fields. 3 meta fields.'
        );
        let allFields = await PageObjects.discover.getAllFieldNames();
        expect(allFields.includes('_invalid-runtimefield')).to.be(true);

        await browser.refresh();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('discoverNoResultsError'); // still has error

        // check that the sidebar is rendered event after a refresh
        await PageObjects.discover.waitUntilSidebarHasLoaded();
        allFields = await PageObjects.discover.getAllFieldNames();
        expect(allFields.includes('_invalid-runtimefield')).to.be(true);

        await PageObjects.discover.removeField('_invalid-runtimefield');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        await testSubjects.missingOrFail('discoverNoResultsError');
      });

      it('should work correctly when time range is updated', async function () {
        await esArchiver.loadIfNeeded(
          'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
        );
        await kibanaServer.importExport.load(
          'test/functional/fixtures/kbn_archiver/index_pattern_without_timefield'
        );

        await browser.refresh();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '53 available fields. 0 empty fields. 3 meta fields.'
        );

        await PageObjects.discover.selectIndexPattern('with-timefield');

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '0 available fields. 7 empty fields. 3 meta fields.'
        );
        await testSubjects.existOrFail(
          `${PageObjects.discover.getSidebarSectionSelector(
            'available'
          )}NoFieldsCallout-noFieldsMatch`
        );

        await PageObjects.timePicker.setAbsoluteRange(
          'Sep 21, 2019 @ 00:00:00.000',
          'Sep 23, 2019 @ 00:00:00.000'
        );

        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.discover.waitUntilSidebarHasLoaded();

        expect(await PageObjects.discover.getSidebarAriaDescription()).to.be(
          '7 available fields. 0 empty fields. 3 meta fields.'
        );

        await kibanaServer.importExport.unload(
          'test/functional/fixtures/kbn_archiver/index_pattern_without_timefield'
        );

        await esArchiver.unload(
          'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
        );
      });
    });
  });
}
