import os, platform, sys
from os import path
from build_util import runcmd, mkdir

# This is a cross-platform initialization script which should only be run
# once per environment.

# Set to "arm" to build for ARM
build_path = path.abspath(os.curdir)
src_path = path.abspath(path.join(build_path, 'chromium', 'src'))

# Configure git
print('Configuring git globals...')
runcmd('git config --global core.autocrlf false')
runcmd('git config --global core.filemode false')
runcmd('git config --global branch.autosetuprebase always')
runcmd('git config --global core.compression 0')

# Grab Chromium's custom build tools, if they aren't already installed
# Put depot_tools on the path so we can properly run the fetch command
if not path.isdir('depot_tools'):
  print('Installing depot_tools...')
  runcmd('git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git')
else:
  print('Updating depot_tools...')
  original_dir = os.curdir
  os.chdir(path.join(build_path, 'depot_tools'))
  runcmd('git checkout main')
  runcmd('git pull origin main')
  os.chdir(original_dir)

# Fetch the Chromium source code
chromium_dir = path.join(build_path, 'chromium')
if not path.isdir(chromium_dir):
  mkdir(chromium_dir)
  os.chdir(chromium_dir)
  runcmd('fetch chromium --nohooks=1 --no-history=1')
else:
  print('Directory exists: ' + chromium_dir + '. Skipping chromium fetch.')
