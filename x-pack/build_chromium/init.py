import os, platform, sys
from build_util import runcmd, mkdir, md5_file, root_dir, configure_environment

# This is a cross-platform initialization script which should only be run
# once per environment, and isn't intended to be run directly. You should
# run the appropriate platform init script (e.g. Linux/init.sh) which will
# call this once the platform-specific initialization has completed.

os.chdir(root_dir)

# Configure git
runcmd('git config --global core.autocrlf false')
runcmd('git config --global core.filemode false')
runcmd('git config --global branch.autosetuprebase always')

# Grab Chromium's custom build tools, if they aren't already installed
# (On Windows, they are installed before this Python script is run)
if not os.path.isdir('depot_tools'):
  runcmd('git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git')

# Put depot_tools on the path so we can properly run the fetch command
configure_environment()

# Fetch the Chromium source code
mkdir('chromium')
os.chdir('chromium')
runcmd('fetch chromium')

# Build Linux deps
if platform.system() == 'Linux':
  os.chdir('src')

  if len(sys.argv) >= 2:
    sysroot_cmd = 'build/linux/sysroot_scripts/install-sysroot.py --arch=' + sys.argv[1]
    print('Running `' + sysroot_cmd + '`')
    runcmd(sysroot_cmd)

  runcmd('build/install-build-deps.sh')
