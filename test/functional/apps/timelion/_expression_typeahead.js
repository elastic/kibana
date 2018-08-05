/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from 'expect.js';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'timelion', 'header', 'settings']);

  describe('expression typeahead', () => {
    before(async () => {
      await PageObjects.timelion.initTests();

      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('should display function suggestions filtered by function name', async () => {
      await PageObjects.timelion.setExpression('.e');
      const suggestions = await PageObjects.timelion.getSuggestionItemsText();
      expect(suggestions.length).to.eql(2);
      expect(suggestions[0].includes('.elasticsearch()')).to.eql(true);
      expect(suggestions[1].includes('.es()')).to.eql(true);
    });

    it('should show argument suggestions when function suggestion is selected', async () => {
      await PageObjects.timelion.setExpression('.es()', 4);
      const suggestions = await PageObjects.timelion.getSuggestionItemsText();
      expect(suggestions.length).to.eql(9);
      expect(suggestions[0].includes('fit=')).to.eql(true);
    });

    it('should show argument value suggestions when argument is selected', async () => {
      await PageObjects.timelion.setExpression('.legend(position=)', 17);
      const valueSuggestions = await PageObjects.timelion.getSuggestionItemsText();
      expect(valueSuggestions.length).to.eql(5);
      expect(valueSuggestions[0].includes('disable legend')).to.eql(true);
      expect(valueSuggestions[1].includes('place legend in north east corner')).to.eql(true);
    });

    describe('dynamic suggestions for argument values', () => {
      describe('.es()', () => {
        it('should show index pattern suggestions for index argument', async () => {
          await PageObjects.timelion.setExpression('.es(index=)', 10);
          const suggestions = await PageObjects.timelion.getSuggestionItemsText();
          expect(suggestions.length).to.eql(1);
          expect(suggestions[0].includes('logstash-*')).to.eql(true);
        });

        it('should show field suggestions for timefield argument when index pattern set', async () => {
          await PageObjects.timelion.setExpression('.es(index=logstash-*,timefield=)', 31);
          const suggestions = await PageObjects.timelion.getSuggestionItemsText();
          expect(suggestions.length).to.eql(4);
          expect(suggestions[0].includes('@timestamp')).to.eql(true);
        });

        it('should show field suggestions for split argument when index pattern set', async () => {
          await PageObjects.timelion.setExpression('.es(index=logstash-*,split=)', 27);
          const suggestions = await PageObjects.timelion.getSuggestionItemsText();
          expect(suggestions.length).to.eql(52);
          expect(suggestions[0].includes('@message.raw')).to.eql(true);
        });

        it('should show field suggestions for metric argument when index pattern set', async () => {
          await PageObjects.timelion.setExpression('.es(index=logstash-*,metric=avg:)', 32);
          const suggestions = await PageObjects.timelion.getSuggestionItemsText();
          expect(suggestions.length).to.eql(7);
          expect(suggestions[0].includes('avg:bytes')).to.eql(true);
        });
      });
    });
  });
}
