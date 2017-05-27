export function mirrorStatus(status, esStatus) {
  if (!esStatus) {
    status.red('UI Settings requires the elasticsearch plugin');
    return;
  }

  const setStatus = state => {
    const statusMessage = state === 'green' ? 'Ready' : `Elasticsearch plugin is ${state}`;
    status[state](statusMessage);
  };

  setStatus(esStatus.state);
  esStatus.on('change', () => setStatus(esStatus.state));
}
