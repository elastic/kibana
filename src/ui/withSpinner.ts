import { logger } from '../services/logger';
import ora = require('ora');

export async function withSpinner<T>(
  { text }: { text: string },
  fn: (spinner: ora.Ora) => Promise<T>
): Promise<T> {
  logger.info(text);
  const spinner = ora(text).start();

  try {
    const res = await fn(spinner);
    spinner.succeed();

    return res;
  } catch (e) {
    logger.info(e.message);
    spinner.fail();
    throw e;
  }
}
