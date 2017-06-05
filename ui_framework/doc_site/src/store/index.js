export function getIsCodeViewerOpen(state) {
  return state.codeViewer.isOpen;
}

export function getSections(state) {
  return state.sections.sections;
}

export function getSource(state) {
  return state.codeViewer.source;
}

export function getTitle(state) {
  return state.codeViewer.title;
}
