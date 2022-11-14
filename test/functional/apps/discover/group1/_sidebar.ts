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
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');

  describe('discover sidebar', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    describe('field filtering', function () {
      it('should reveal and hide the filter form when the toggle is clicked', async function () {
        await PageObjects.discover.openSidebarFieldFilter();
        await PageObjects.discover.closeSidebarFieldFilter();
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
      it('should show field list groups excluding multifields', async function () {
        expect(await PageObjects.discover.doesSidebarShowFields()).to.be(true);

        // Initial Available fields
        const expectedInitialAvailableFields =
          '@message, @tags, @timestamp, agent, bytes, clientip, extension, geo.coordinates, geo.dest, geo.src, geo.srcdest, headings, host, id, index, ip, links, machine.os, machine.ram, machine.ram_range, memory, meta.char, meta.related, meta.user.firstname, meta.user.lastname, nestedField.child, phpmemory, referer, relatedContent.article:modified_time, relatedContent.article:published_time, relatedContent.article:section, relatedContent.article:tag, relatedContent.og:description, relatedContent.og:image, relatedContent.og:image:height, relatedContent.og:image:width, relatedContent.og:site_name, relatedContent.og:title, relatedContent.og:type, relatedContent.og:url, relatedContent.twitter:card, relatedContent.twitter:description, relatedContent.twitter:image, relatedContent.twitter:site, relatedContent.twitter:title, relatedContent.url, request, response, spaces, type';
        let availableFields = await PageObjects.discover.getSidebarSectionFieldNames('available');
        expect(availableFields.length).to.be(50);
        expect(availableFields.join(', ')).to.be(expectedInitialAvailableFields);

        // Available fields after scrolling down
        const emptySectionButton = await find.byCssSelector(
          PageObjects.discover.getSidebarSectionSelector('empty')
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
      });

      it('should show field list groups including multifields when searched from source', async function () {
        await kibanaServer.uiSettings.update({ 'discover:searchFieldsFromSource': true });
        await browser.refresh();

        expect(await PageObjects.discover.doesSidebarShowFields()).to.be(true);

        // Initial Available fields
        const expectedInitialAvailableFields =
          '@message, @message.raw, @tags, @tags.raw, @timestamp, agent, agent.raw, bytes, clientip, extension, extension.raw, geo.coordinates, geo.dest, geo.src, geo.srcdest, headings, headings.raw, host, host.raw, id, index, index.raw, ip, links, links.raw, machine.os, machine.os.raw, machine.ram, machine.ram_range, memory, meta.char, meta.related, meta.user.firstname, meta.user.lastname, nestedField.child, phpmemory, referer, relatedContent.article:modified_time, relatedContent.article:published_time, relatedContent.article:section, relatedContent.article:section.raw, relatedContent.article:tag, relatedContent.article:tag.raw, relatedContent.og:description, relatedContent.og:description.raw, relatedContent.og:image, relatedContent.og:image:height, relatedContent.og:image:height.raw, relatedContent.og:image:width, relatedContent.og:image:width.raw';
        let availableFields = await PageObjects.discover.getSidebarSectionFieldNames('available');
        expect(availableFields.length).to.be(50);
        expect(availableFields.join(', ')).to.be(expectedInitialAvailableFields);

        // Available fields after scrolling down
        const emptySectionButton = await find.byCssSelector(
          PageObjects.discover.getSidebarSectionSelector('empty')
        );
        await emptySectionButton.scrollIntoViewIfNecessary();
        availableFields = await PageObjects.discover.getSidebarSectionFieldNames('available');
        expect(availableFields.length).to.be(75);

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
        await kibanaServer.uiSettings.unset('discover:searchFieldsFromSource');
        await browser.refresh();
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
      });
    });
  });
}
