/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import getosSync from 'getos';
import { promisify } from 'util';

const getos = promisify(getosSync);

const distroSupportsUnprivilegedUsernamespaces = (distro: string) => {
  // Debian 7 and 8 don't support usernamespaces by default
  // this should be reevaluated when Debian 9 is available
  if (distro.toLowerCase() === 'debian') {
    return false;
  }

  // Starting at CentOS 7.2 usernamespaces are in the kernel
  // but they must be explicitly enabled. This should be reevaluated
  // once CentOS 7.5+ is available
  if (distro.toLowerCase() === 'centos') {
    return false;
  }

  // Tested on OracleLinux 7.4 (which returns 'red hat linux' for distro) and sandboxing failed.
  if (distro.toLowerCase() === 'red hat linux') {
    return false;
  }

  return true;
};

export async function getDefaultChromiumSandboxDisabled() {
  const os = await getos();

  if (os.os === 'linux' && !distroSupportsUnprivilegedUsernamespaces(os.dist)) {
    return true;
  } else {
    return false;
  }
}
