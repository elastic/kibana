/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ES_FIELD_TYPES } from '@kbn/field-types';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { FIELD_FORMAT_IDS } from '../../../../src/plugins/data/common';
import { WebElementWrapper } from '../../services/lib/web_element_wrapper';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings', 'common']);
  const testSubjects = getService('testSubjects');
  const es = getService('es');
  const indexPatterns = getService('indexPatterns');
  const toasts = getService('toasts');

  describe('field formatter', function () {
    this.tags(['skipFirefox']);

    before(async function () {
      await browser.setWindowSize(1200, 800);
      await esArchiver.load('test/functional/fixtures/es_archiver/discover');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.uiSettings.update({});
    });

    after(async function afterAll() {
      await PageObjects.settings.navigateTo();
      await esArchiver.emptyKibanaIndex();
    });

    describe('set and change field formatter', function describeIndexTests() {
      // addresses https://github.com/elastic/kibana/issues/93349
      it('can change format more than once', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        await PageObjects.settings.clickAddField();
        await PageObjects.settings.setFieldType('Long');
        const formatRow = await testSubjects.find('formatRow');
        const formatRowToggle = (
          await formatRow.findAllByCssSelector('[data-test-subj="toggle"]')
        )[0];

        await formatRowToggle.click();
        await PageObjects.settings.setFieldFormat('duration');
        await PageObjects.settings.setFieldFormat('bytes');
        await PageObjects.settings.setFieldFormat('duration');
        await testSubjects.click('euiFlyoutCloseButton');
        await PageObjects.settings.closeIndexPatternFieldEditor();
      });
    });

    /**
     * The purpose of these tests is to cover **editing experience** of different field formats editors,
     * The logic of each converter is extensively covered by unit tests.
     * TODO: these tests also could check field formats behaviour with different combinations of browser locale, timezone and ui settings
     */
    describe('field format editors', () => {
      describe('String format', () => {
        testFormatEditors([
          {
            fieldType: ES_FIELD_TYPES.TEXT,
            fieldValue: 'A regular text',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'A regular text',
          },
          {
            fieldType: ES_FIELD_TYPES.TEXT,
            fieldValue: 'A regular text',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'a regular text',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'lower');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'a keyword',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'A KEYWORD',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'upper');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'a keyword',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'A Keyword',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'title');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'com.organizations.project.ClassName',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'c.o.p.ClassName',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'short');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'SGVsbG8gd29ybGQ=',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'Hello world',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'base64');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: '%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: '안녕 키바나',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'urlparam');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: '123456789',
            applyFormatterType: FIELD_FORMAT_IDS.TRUNCATE,
            expectFormattedValue: '123...',
            beforeSave: async () => {
              await testSubjects.setValue('truncateEditorLength', '3');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.INTEGER,
            fieldValue: 324,
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: '324',
          },
        ]);
      });

      describe('Number format', () => {
        testFormatEditors([
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 324,
            applyFormatterType: FIELD_FORMAT_IDS.NUMBER,
            expectFormattedValue: '324',
          },
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 324,
            applyFormatterType: FIELD_FORMAT_IDS.NUMBER,
            expectFormattedValue: '+324',
            beforeSave: async () => {
              await testSubjects.setValue('numberEditorFormatPattern', '+0,0');
            },
          },
        ]);
      });

      describe('URL format', () => {
        testFormatEditors([
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 100,
            applyFormatterType: FIELD_FORMAT_IDS.URL,
            expectFormattedValue: 'https://elastic.co/?value=100',
            beforeSave: async () => {
              await testSubjects.setValue(
                'urlEditorUrlTemplate',
                'https://elastic.co/?value={{value}}'
              );
            },
          },
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 100,
            applyFormatterType: FIELD_FORMAT_IDS.URL,
            expectFormattedValue: 'url label',
            beforeSave: async () => {
              await testSubjects.setValue(
                'urlEditorUrlTemplate',
                'https://elastic.co/?value={{value}}'
              );
              await testSubjects.setValue('urlEditorLabelTemplate', 'url label');
            },
          },
        ]);
      });

      describe('Date format', () => {
        testFormatEditors([
          {
            fieldType: ES_FIELD_TYPES.DATE,
            fieldValue: '2021-08-05T15:05:37.151Z',
            applyFormatterType: FIELD_FORMAT_IDS.DATE,
            expectFormattedValue: 'Aug 5, 2021',
            beforeSave: async () => {
              await testSubjects.setValue('dateEditorPattern', 'MMM D, YYYY');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.DATE_NANOS,
            fieldValue: '2015-01-01T12:10:30.123456789Z',
            applyFormatterType: FIELD_FORMAT_IDS.DATE,
            expectFormattedValue: 'Jan 1, 2015 @ 12:10:30.123',
          },
          {
            fieldType: ES_FIELD_TYPES.DATE_NANOS,
            fieldValue: '2015-01-01T12:10:30.123456789Z',
            applyFormatterType: FIELD_FORMAT_IDS.DATE_NANOS,
            expectFormattedValue: 'Jan 1, 2015 @ 12:10:30.123456789',
          },
        ]);
      });

      describe('Other formats', () => {
        testFormatEditors([
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 123292,
            applyFormatterType: FIELD_FORMAT_IDS.DURATION,
            expectFormattedValue: '2 minutes',
            beforeSave: async () => {
              await testSubjects.setValue('durationEditorInputFormat', 'milliseconds');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.DOUBLE,
            fieldValue: 0.1,
            applyFormatterType: FIELD_FORMAT_IDS.PERCENT,
            expectFormattedValue: '10.0%',
            beforeSave: async () => {
              await testSubjects.setValue('numberEditorFormatPattern', '0.0%');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 1990000000,
            applyFormatterType: FIELD_FORMAT_IDS.BYTES,
            expectFormattedValue: '2GB',
            beforeSave: async () => {
              await testSubjects.setValue('numberEditorFormatPattern', '0b');
            },
          },
        ]);
      });
    });
  });

  function testFormatEditors(specs: FieldFormatEditorSpecDescriptor[]) {
    const indexTitle = 'field_formats_management_functional_tests';
    let indexPatternId: string;
    let testDocumentId: string;

    before(async () => {
      if ((await es.indices.exists({ index: indexTitle })).body) {
        await es.indices.delete({ index: indexTitle });
      }

      await es.indices.create({
        index: indexTitle,
        body: {
          mappings: {
            properties: specs.reduce((properties, spec, index) => {
              properties[`${index}`] = { type: spec.fieldType };
              return properties;
            }, {} as Record<string, { type: ES_FIELD_TYPES }>),
          },
        },
      });

      const docResult = await es.index({
        index: indexTitle,
        body: specs.reduce((properties, spec, index) => {
          properties[`${index}`] = spec.fieldValue;
          return properties;
        }, {} as Record<string, FieldFormatEditorSpecDescriptor['fieldValue']>),
        refresh: 'wait_for',
      });
      testDocumentId = docResult.body._id;

      const indexPatternResult = await indexPatterns.create(
        { title: indexTitle },
        { override: true }
      );
      indexPatternId = indexPatternResult.id;
    });

    describe('edit formats', () => {
      before(async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternByName(indexTitle);
      });

      specs.forEach((spec, index) => {
        const fieldName = `${index}`;
        it(`edit field format of "${fieldName}" field to "${spec.applyFormatterType}"`, async () => {
          await PageObjects.settings.filterField(fieldName);
          await PageObjects.settings.openControlsByName(fieldName);
          await PageObjects.settings.toggleRow('formatRow');
          await PageObjects.settings.setFieldFormat(spec.applyFormatterType);
          if (spec.beforeSave) {
            await spec.beforeSave(await testSubjects.find('formatRow'));
          }
          await PageObjects.settings.controlChangeSave();
          await toasts.dismissToast(); // dismiss "saved" toast, otherwise it could overlap save button for a next test
        });
      });
    });

    describe('check formats', async () => {
      before(async () => {
        await PageObjects.common.navigateToApp('discover', {
          hash: `/doc/${indexPatternId}/${indexTitle}?id=${testDocumentId}`,
        });
        await testSubjects.exists('doc-hit');
      });

      specs.forEach((spec, index) => {
        it(`check field format of "${index}" field`, async () => {
          const renderedValue = await testSubjects.find(`tableDocViewRow-${index}-value`);
          const text = await renderedValue.getVisibleText();
          expect(text).to.be(spec.expectFormattedValue);
        });
      });
    });
  }
}

/**
 * Describes a field format editor test
 */
interface FieldFormatEditorSpecDescriptor {
  /**
   * Raw field value to put into document
   */
  fieldValue: string | number | boolean | null;
  /**
   * Explicitly specify a type for a {@link fieldValue}
   */
  fieldType: ES_FIELD_TYPES;
  /**
   * Type of a field formatter to apply
   */
  applyFormatterType: FIELD_FORMAT_IDS;
  /**
   * Function to execute before field format is applied.
   * Use it set specific configuration params for applied field formatter
   * @param formatRowContainer - field format editor container
   */
  beforeSave?: (formatRowContainer: WebElementWrapper) => Promise<void>;

  /**
   * An expected formatted value rendered by Discover app,
   * Use this for final assertion
   */
  expectFormattedValue: string;
}
