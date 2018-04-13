export function TimePickerProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  class TimePicker {

    async getQueryString() {
      const queryInput = await testSubjects.find('queryInput');
      return await queryInput.getProperty('value');
    }

  }

  return new TimePicker();
}
