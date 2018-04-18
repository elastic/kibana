export class IndexPatternCreationType {
  static key = 'default';

  constructor() {
    this.type = '';
    this.name = 'index pattern';
    this.showSystemIndices = true;
    this.allowWildcards = true;
  }

  async getIndexPatternCreationOption(urlHandler) {
    return {
      text: `Standard index pattern`,
      description: `Can perform full aggregations against any data`,
      onClick: () => {
        urlHandler('/management/kibana/index');
      },
    };
  }

  getIndexPatternType = () => {
    return this.type;
  }

  getIndexPatternName = () => {
    return this.name;
  }

  getIndexPatternCreationQuery = () => {
    return {};
  };

  getShowSystemIndices = () => {
    return this.showSystemIndices;
  }

  getAllowWildcards = () => {
    return this.allowWildcards;
  }

  illegalCharacters = (characters = []) => {
    return characters;
  }

  getIndexTags() {
    return [];
  }

  checkIndicesForErrors = () => {
    return undefined;
  }

  getIndexPatternMappings = () => {
    return {};
  }

  renderPrompt = () => {
    return null;
  }
}
