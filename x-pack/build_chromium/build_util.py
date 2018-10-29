import os, hashlib

# This file contains various utility functions used by the init and build scripts

# Compute the root build and script directory as relative to this file
script_dir = os.path.realpath(os.path.join(__file__, '..'))
root_dir = os.path.realpath(os.path.join(script_dir, '..'))

def runcmd(cmd):
  """Executes a string command in the shell"""
  print(cmd)
  result = os.system(cmd)
  if result != 0:
    raise Exception(cmd + ' returned ' + str(result))

def mkdir(dir):
  """Makes a directory if it doesn't exist"""
  if not os.path.exists(dir):
    print('mkdir -p ' + dir)
    return os.makedirs(dir)

def md5_file(filename):
  """Builds a hex md5 hash of the given file"""
  md5 = hashlib.md5()
  with open(filename, 'rb') as f: 
    for chunk in iter(lambda: f.read(128 * md5.block_size), b''): 
      md5.update(chunk)
  return md5.hexdigest()

def configure_environment():
  """Configures temporary environment variables required by Chromium's build"""
  depot_tools_path = os.path.join(root_dir, 'depot_tools')
  os.environ['PATH'] = depot_tools_path + os.pathsep + os.environ['PATH']
