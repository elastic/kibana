async function handleRequest(request) {
  const { key } = request.params;
  const uiSettings = request.getUiSettingsService();

  await uiSettings.remove(key);
  return {
    settings: await uiSettings.getUserProvided()
  };
}

export const deleteRoute = {
  path: '/api/kibana/settings/{key}',
  method: 'DELETE',
  handler(request, reply) {
    reply(handleRequest(request));
  }
};
