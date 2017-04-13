import defaultEditorTemplate from './default.html';

const defaultEditor = function () {
  return {
    name: 'default',
    render: () => {
      return defaultEditorTemplate;
    }
  };
};

export { defaultEditor };
