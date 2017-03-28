export function DocTableProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  class DocTable {
    getTable() {
      return testSubjects.find('docTable');
    }

    async getBodyRows(table) {
      return await table.findAllByCssSelector('[data-test-subj~="docTableRow"]');
    }

    async getAnchorRow(table) {
      return await table.findByCssSelector('[data-test-subj~="docTableAnchorRow"]');
    }

    async getRowExpandToggle(row) {
      return await row.findByCssSelector('[data-test-subj~="docTableExpandToggleColumn"]');
    }

    async getDetailsRows(table) {
      return await table.findAllByCssSelector('[data-test-subj~="docTableRow"] + tr');
    }

    async getRowActions(row) {
      return await row.findAllByCssSelector('[data-test-subj~="docTableRowAction"]');
    }

    async getFields(row) {
      return await row.findAllByCssSelector('[data-test-subj~="docTableField"]');
    }

    async getHeaderFields(table) {
      return await table.findAllByCssSelector('[data-test-subj~="docTableHeaderField"]');
    }
  }

  return new DocTable();
}
