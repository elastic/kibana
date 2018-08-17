import os, hashlib

# This file contains various utility functions used by the init and build scripts

# Compute the root build and script directory as relative to this file
script_dir = os.path.realpath(os.path.join(__file__, '..'))
root_dir = os.path.realpath(os.path.join(script_dir, '..'))

# Execute a string command in the shell
def runcmd(cmd):
  print(cmd)
  result = os.system(cmd)
  if result != 0:
    raise Exception(cmd + ' returned ' + str(result))

# Make dir if not exists
def mkdir(dir):
  if not os.path.exists(dir):
    print('mkdir -p ' + dir)
    return os.makedirs(dir)

# MD5 hash a file
def md5_file(filename):
  md5 = hashlib.md5()
  with open(filename, 'rb') as f: 
    for chunk in iter(lambda: f.read(128 * md5.block_size), b''): 
      md5.update(chunk)
  md5.digest()

# Set up environment variables required by Chromium build
def configure_environment():
  depot_tools_path = os.path.join(root_dir, 'depot_tools')
  os.environ['PATH'] = depot_tools_path + os.pathsep + os.environ['PATH']
  os.environ['DEPOT_TOOLS_WIN_TOOLCHAIN'] = '0'
