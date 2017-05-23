import Bluebird from 'bluebird';

export function ConsolePageProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  async function getVisibleTextFromAceEditor(editor) {
    const lines = await editor.findAllByClassName('ace_line_group');
    const linesText = await Bluebird.map(lines, l => l.getVisibleText());
    return linesText.join('\n');
  }

  return new class ConsolePage {
    async getRequestEditor() {
      return await testSubjects.find('request-editor');
    }

    async getRequest() {
      const requestEditor = await this.getRequestEditor();
      return await getVisibleTextFromAceEditor(requestEditor);
    }

    async getResponse() {
      const responseEditor = await testSubjects.find('response-editor');
      return await getVisibleTextFromAceEditor(responseEditor);
    }

    async clickPlay() {
      await testSubjects.click('send-request-button');
    }

    async collapseHelp() {
      await testSubjects.click('help-close-button');
    }

    async openSettings() {
      await testSubjects.click('consoleSettingsButton');
    }

    async setFontSizeSetting(newSize) {
      await this.openSettings();

      // while the settings form opens/loads this may fail, so retry for a while
      await retry.try(async () => {
        const fontSizeInput = await testSubjects.find('setting-font-size-input');
        await fontSizeInput.clearValue();
        await fontSizeInput.click();
        await fontSizeInput.type(String(newSize));
      });

      await testSubjects.click('settings-save-button');
    }

    async getFontSize(editor) {
      const aceLine = await editor.findByClassName('ace_line');
      return await aceLine.getComputedStyle('font-size');
    }

    async getRequestFontSize() {
      return await this.getFontSize(await this.getRequestEditor());
    }
  };
}
