import expect from 'expect.js';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'timelion', 'header', 'settings']);

  describe('expression typeahead', () => {
    before(async () => {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      await PageObjects.timelion.initTests();
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);

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
      await PageObjects.timelion.setExpression('.es');
      await PageObjects.timelion.clickSuggestion();
      const suggestions = await PageObjects.timelion.getSuggestionItemsText();
      expect(suggestions.length).to.eql(9);
      expect(suggestions[0].includes('fit=')).to.eql(true);
    });

    it('should show argument value suggestions when argument is selected', async () => {
      await PageObjects.timelion.setExpression('.legend');
      await PageObjects.timelion.clickSuggestion();
      const argumentSuggestions = await PageObjects.timelion.getSuggestionItemsText();
      expect(argumentSuggestions.length).to.eql(4);
      expect(argumentSuggestions[1].includes('position=')).to.eql(true);
      await PageObjects.timelion.clickSuggestion(1);
      const valueSuggestions = await PageObjects.timelion.getSuggestionItemsText();
      expect(valueSuggestions.length).to.eql(5);
      expect(valueSuggestions[0].includes('disable legend')).to.eql(true);
      expect(valueSuggestions[1].includes('place legend in north east corner')).to.eql(true);
    });

    describe('dynamic suggestions for argument values', () => {
      describe('.es()', () => {
        before(async () => {
          await PageObjects.timelion.setExpression('.es');
          await PageObjects.timelion.clickSuggestion();
        });

        it('should show index pattern suggestions for index argument', async () => {
          await PageObjects.timelion.updateExpression('index');
          await PageObjects.timelion.clickSuggestion();
          const suggestions = await PageObjects.timelion.getSuggestionItemsText();
          expect(suggestions.length).to.eql(1);
          expect(suggestions[0].includes('logstash-*')).to.eql(true);
          await PageObjects.timelion.clickSuggestion();
        });

        it('should show field suggestions for timefield argument when index pattern set', async () => {
          await PageObjects.timelion.updateExpression(',timefield');
          await PageObjects.timelion.clickSuggestion();
          const suggestions = await PageObjects.timelion.getSuggestionItemsText();
          expect(suggestions.length).to.eql(4);
          expect(suggestions[0].includes('@timestamp')).to.eql(true);
          await PageObjects.timelion.clickSuggestion();
        });

        it('should show field suggestions for split argument when index pattern set', async () => {
          await PageObjects.timelion.updateExpression(',split');
          await PageObjects.timelion.clickSuggestion();
          const suggestions = await PageObjects.timelion.getSuggestionItemsText();
          expect(suggestions.length).to.eql(52);
          expect(suggestions[0].includes('@message.raw')).to.eql(true);
          await PageObjects.timelion.clickSuggestion(10);
        });

        it('should show field suggestions for metric argument when index pattern set', async () => {
          await PageObjects.timelion.updateExpression(',metric');
          await PageObjects.timelion.clickSuggestion();
          await PageObjects.timelion.updateExpression('avg:');
          await PageObjects.timelion.clickSuggestion();
          const suggestions = await PageObjects.timelion.getSuggestionItemsText();
          expect(suggestions.length).to.eql(2);
          expect(suggestions[0].includes('avg:bytes')).to.eql(true);
        });
      });
    });
  });
}
