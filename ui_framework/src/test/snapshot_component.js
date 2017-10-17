export const snapshotComponent = component => {
  const html = component.html();
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.firstChild;
};
