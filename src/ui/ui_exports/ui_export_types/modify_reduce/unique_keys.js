export const uniqueKeys = (sourceType) => (next) => (acc, spec, type, pluginSpec) => {
  const duplicates = Object.keys(spec)
    .filter(key => acc[type] && acc[type].hasOwnProperty(key));

  if (duplicates.length) {
    throw new Error(`${pluginSpec.id()} defined duplicate ${sourceType || type} values: ${duplicates}`);
  }

  return next(acc, spec, type, pluginSpec);
};
