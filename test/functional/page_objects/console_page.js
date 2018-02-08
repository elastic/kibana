import Bluebird from 'bluebird';
import Keys from 'leadfoot/keys';

export function ConsolePageProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');

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

    // async clearAceEditor() {
    //   const input = await find.byCssSelector('#editor > div.ace_scroller > div');
    //   // Since we use ACE editor and that isn't really storing its value inside
    //   // a textarea we must really select all text and remove it, and cannot use
    //   // clearValue().
    //   await input.click();
    //   await input.session.pressKeys([Keys.CONTROL, 'a']); // Select all text
    //   await input.session.pressKeys(Keys.NULL); // Release modifier keys
    //   await input.session.pressKeys(Keys.BACKSPACE); // Delete all content
    // }

    async setRequest(request) {
      const input = await find.byCssSelector('#editor > div.ace_scroller > div');
      await input.session.pressKeys([Keys.ARROW_RIGHT]);
      await input.session.pressKeys([Keys.ARROW_DOWN]);
      await input.session.pressKeys([Keys.ARROW_DOWN]);
      await input.session.pressKeys([Keys.ARROW_DOWN]);
      await input.session.pressKeys([Keys.ARROW_DOWN]);
      await input.session.pressKeys([Keys.ARROW_DOWN]);
      await input.session.pressKeys([Keys.ARROW_DOWN]);
      await input.session.pressKeys([Keys.ARROW_DOWN]);
      await input.session.pressKeys([Keys.ENTER]);
      await input.session.pressKeys([Keys.ENTER]);
      await input.session.pressKeys([Keys.ENTER]);
      await input.session.pressKeys(request.split(''));
    }


  };
}
